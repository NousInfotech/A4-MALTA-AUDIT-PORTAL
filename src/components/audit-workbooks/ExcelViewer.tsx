// import React, { useState, useCallback, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
//   Plus,
//   Edit,
//   Trash2,
//   Save,
//   X,
//   Database,
//   CheckCircle,
//   AlertCircle,
//   Loader2,
// } from "lucide-react";
// import {
//   Workbook,
//   SheetData,
//   Selection,
//   Mapping,
//   NamedRange,
// } from "../../types/audit-workbooks/types";
// import { useToast } from "@/hooks/use-toast";
// import { SaveSheetRequest, SaveWorkbookRequest, workbookApi } from "@/lib/api/workbookApi";

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
//   namedRanges: NamedRange[];
//   onBack: () => void;
//   onLinkField: (selection: Selection) => void;
//   onLinkSheet: () => void;
//   onLinkWorkbook: () => void;
//   onReupload: () => void;
//   onViewAuditLog: () => void;
//   onCreateMapping: (mapping: Mapping) => void;
//   onUpdateMapping: (id: string, mapping: Partial<Mapping>) => void;
//   onDeleteMapping: (id: string) => void;
//   onCreateNamedRange: (namedRange: NamedRange) => void;
//   onUpdateNamedRange: (id: string, namedRange: Partial<NamedRange>) => void;
//   onDeleteNamedRange: (id: string) => void;
//   isFullscreenMode?: boolean;
//   onToggleFullscreen?: () => void;
// }

// export const ExcelViewer: React.FC<ExcelViewerProps> = ({
//   workbook,
//   mappings,
//   namedRanges,
//   onBack,
//   onLinkField,
//   onLinkSheet,
//   onLinkWorkbook,
//   onReupload,
//   onViewAuditLog,
//   onCreateMapping,
//   onUpdateMapping,
//   onDeleteMapping,
//   onCreateNamedRange,
//   onUpdateNamedRange,
//   onDeleteNamedRange,
//   isFullscreenMode = false,
//   onToggleFullscreen,
// }) => {

//   const { toast } = useToast();
//   const sheetData: SheetData = workbook?.fileData || {};
//   const sheetNames = Object.keys(sheetData);

//   const [selectedSheet, setSelectedSheet] = useState<string>(
//     sheetNames[0] || "Balance_Sheet"
//   );
//   const [selection, setSelection] = useState<Selection | null>(null);
//   const [isSelecting, setIsSelecting] = useState(false);

//    // Save dialog states
//   const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
//   const [saveType, setSaveType] = useState<'workbook' | 'sheet'>('workbook');
//   const [isSaving, setIsSaving] = useState(false);

//   // State for managing named ranges
//   const [isCreateNamedRangeOpen, setIsCreateNamedRangeOpen] = useState(false);
//   const [isEditNamedRangeOpen, setIsEditNamedRangeOpen] = useState(false);
//   const [editingNamedRange, setEditingNamedRange] = useState<NamedRange | null>(null);
//   const [newNamedRangeName, setNewNamedRangeName] = useState("");
//   const [newNamedRangeRange, setNewNamedRangeRange] = useState("");

//   // State for managing mappings
//   const [isCreateMappingOpen, setIsCreateMappingOpen] = useState(false);
//   const [isEditMappingOpen, setIsEditMappingOpen] = useState(false);
//   const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
//   const [newMappingDestinationField, setNewMappingDestinationField] = useState("");
//   const [newMappingTransform, setNewMappingTransform] = useState("sum");

//   const currentSheetData = sheetData[selectedSheet] || [];

//   /**
//    * Save entire workbook to backend
//    */
//   const handleSaveWorkbook = async () => {
//     if (!workbook) {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: "No workbook data available to save",
//       });
//       return;
//     }

//     setIsSaving(true);

//     try {
//       const request: SaveWorkbookRequest = {
//         workbookId: workbook.id,
//         workbookName: workbook.name,
//         version: workbook.version,
//         sheetData: sheetData,
//         metadata: {
//           uploadedDate: workbook.uploadedDate,
//           lastModifiedBy: workbook.lastModifiedBy || "Current User",
//           lastModified: new Date().toISOString(),
//         },
//       };

//       const response = await workbookApi.saveWorkbook(request);

//       if (response.success) {
//         toast({
//           title: "Success",
//           description: "Workbook saved successfully to database",
//         });
//         setIsSaveDialogOpen(false);
//       } else {
//         throw new Error(response.error || "Failed to save workbook");
//       }
//     } catch (error) {
//       console.error("Error saving workbook:", error);
//       toast({
//         variant: "destructive",
//         title: "Save Failed",
//         description: error instanceof Error ? error.message : "Unknown error occurred",
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   /**
//    * Save current sheet to backend
//    */
//   const handleSaveSheet = async () => {
//     if (!workbook || !selectedSheet) {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: "No sheet data available to save",
//       });
//       return;
//     }

//     setIsSaving(true);

//     try {
//       const request: SaveSheetRequest = {
//         workbookId: workbook.id,
//         workbookName: workbook.name,
//         sheetName: selectedSheet,
//         sheetData: sheetData[selectedSheet] || [],
//         metadata: {
//           uploadedDate: workbook.uploadedDate,
//           lastModifiedBy: workbook.lastModifiedBy || "Current User",
//           lastModified: new Date().toISOString(),
//         },
//       };

//       const response = await workbookApi.saveSheet(request);

//       if (response.success) {
//         toast({
//           title: "Success",
//           description: `Sheet "${selectedSheet}" saved successfully to database`,
//         });
//         setIsSaveDialogOpen(false);
//       } else {
//         throw new Error(response.error || "Failed to save sheet");
//       }
//     } catch (error) {
//       console.error("Error saving sheet:", error);
//       toast({
//         variant: "destructive",
//         title: "Save Failed",
//         description: error instanceof Error ? error.message : "Unknown error occurred",
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   /**
//    * Open save dialog
//    */
//   const openSaveDialog = (type: 'workbook' | 'sheet') => {
//     setSaveType(type);
//     setIsSaveDialogOpen(true);
//   };

//   /**
//    * Handle save confirmation
//    */
//   const handleSaveConfirm = () => {
//     if (saveType === 'workbook') {
//       handleSaveWorkbook();
//     } else {
//       handleSaveSheet();
//     }
//   };

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

//   const handleCreateNamedRange = () => {
//     if (!newNamedRangeName || !newNamedRangeRange) return;

//     const newNamedRange: NamedRange = {
//       id: Date.now().toString(),
//       name: newNamedRangeName,
//       range: newNamedRangeRange,
//     };

//     onCreateNamedRange(newNamedRange);
//     setNewNamedRangeName("");
//     setNewNamedRangeRange("");
//     setIsCreateNamedRangeOpen(false);
//   };

//   const handleEditNamedRange = (namedRange: NamedRange) => {
//     setEditingNamedRange(namedRange);
//     setNewNamedRangeName(namedRange.name);
//     setNewNamedRangeRange(namedRange.range);
//     setIsEditNamedRangeOpen(true);
//   };

//   const handleUpdateNamedRange = () => {
//     if (!editingNamedRange || !newNamedRangeName || !newNamedRangeRange) return;

//     onUpdateNamedRange(editingNamedRange.id, {
//       name: newNamedRangeName,
//       range: newNamedRangeRange,
//     });

//     setEditingNamedRange(null);
//     setNewNamedRangeName("");
//     setNewNamedRangeRange("");
//     setIsEditNamedRangeOpen(false);
//   };

//   const handleDeleteNamedRange = (id: string) => {
//     onDeleteNamedRange(id);
//   };

//   const handleCreateMapping = () => {
//     if (!selection || !newMappingDestinationField) return;

//     const newMapping: Mapping = {
//       id: Date.now().toString(),
//       sheet: selection.sheet,
//       start: selection.start,
//       end: selection.end,
//       destinationField: newMappingDestinationField,
//       transform: newMappingTransform,
//       color: generateColor(),
//     };

//     onCreateMapping(newMapping);
//     setNewMappingDestinationField("");
//     setNewMappingTransform("sum");
//     setIsCreateMappingOpen(false);
//   };

//   const handleEditMapping = (mapping: Mapping) => {
//     setEditingMapping(mapping);
//     setNewMappingDestinationField(mapping.destinationField);
//     setNewMappingTransform(mapping.transform);
//     setIsEditMappingOpen(true);
//   };

//   const handleUpdateMapping = () => {
//     if (!editingMapping || !newMappingDestinationField) return;

//     onUpdateMapping(editingMapping.id, {
//       destinationField: newMappingDestinationField,
//       transform: newMappingTransform,
//     });

//     setEditingMapping(null);
//     setNewMappingDestinationField("");
//     setNewMappingTransform("sum");
//     setIsEditMappingOpen(false);
//   };

//   const handleDeleteMapping = (id: string) => {
//     onDeleteMapping(id);
//   };

//   const renderHeader = () => (
//     <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
//       <div className="flex items-center space-x-4">
//         <Button variant="ghost" size="sm" onClick={onBack}>
//           <ArrowLeft className="h-4 w-4" />
//         </Button>
//         <div>
//           <h1 className="text-lg font-semibold">{workbook.name}</h1>
//           <p className="text-xs text-gray-500">
//             Version {workbook.version} • Last modified{" "}
//             {workbook.lastModified || workbook.uploadedDate}
//           </p>
//         </div>
//       </div>
//       <div className="flex items-center space-x-2">
//         {/* Save Buttons */}
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={() => openSaveDialog('sheet')}
//           className="text-blue-600 border-blue-600 hover:bg-blue-50"
//         >
//           <Database className="h-4 w-4 mr-2" />
//           Save Sheet
//         </Button>
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={() => openSaveDialog('workbook')}
//           className="text-blue-600 border-blue-600 hover:bg-blue-50"
//         >
//           <Database className="h-4 w-4 mr-2" />
//           Save Workbook
//         </Button>

//         {onToggleFullscreen && (
//           <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
//             <Maximize2 className="h-4 w-4" />
//           </Button>
//         )}
//         <Button variant="outline" size="sm" onClick={onViewAuditLog}>
//           <History className="h-4 w-4 mr-2" />
//           Audit Log
//         </Button>
//         <Button variant="outline" size="sm" onClick={onReupload}>
//           <Upload className="h-4 w-4 mr-2" />
//           Re-upload
//         </Button>
//         <Button variant="outline" size="sm">
//           <Settings className="h-4 w-4" />
//         </Button>
//       </div>
//     </header>
//   );

//   // Save Confirmation Dialog
//   const renderSaveDialog = () => (
//     <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>
//             Save {saveType === 'workbook' ? 'Workbook' : 'Sheet'} to Database
//           </DialogTitle>
//         </DialogHeader>

//         <div className="space-y-4 py-4">
//           <div className="space-y-2">
//             <Label>What will be saved:</Label>
//             <div className="p-3 bg-gray-50 rounded-md space-y-2">
//               {saveType === 'workbook' ? (
//                 <>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>Workbook: {workbook?.name}</span>
//                   </div>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>All Sheets: {sheetNames.length} sheet(s)</span>
//                   </div>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>Version: {workbook?.version}</span>
//                   </div>
//                   <div className="flex items-center text-sm text-gray-600 mt-2">
//                     <AlertCircle className="h-4 w-4 mr-2" />
//                     <span>Total rows: {Object.values(sheetData).reduce((sum, sheet) => sum + sheet.length, 0)}</span>
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>Sheet: {selectedSheet}</span>
//                   </div>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>Workbook: {workbook?.name}</span>
//                   </div>
//                   <div className="flex items-center text-sm text-gray-600 mt-2">
//                     <AlertCircle className="h-4 w-4 mr-2" />
//                     <span>Total rows: {sheetData[selectedSheet]?.length || 0}</span>
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>

//           {isSaving && (
//             <div className="flex items-center justify-center p-4">
//               <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
//               <span className="ml-2 text-sm text-gray-600">Saving to database...</span>
//             </div>
//           )}
//         </div>

//         <DialogFooter>
//           <Button
//             variant="outline"
//             onClick={() => setIsSaveDialogOpen(false)}
//             disabled={isSaving}
//           >
//             Cancel
//           </Button>
//           <Button
//             onClick={handleSaveConfirm}
//             disabled={isSaving}
//           >
//             {isSaving ? (
//               <>
//                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                 Saving...
//               </>
//             ) : (
//               <>
//                 <Database className="h-4 w-4 mr-2" />
//                 Confirm Save
//               </>
//             )}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );

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
//         <div className="flex gap-2">
//           <Button size="sm" variant="outline" onClick={() => setIsCreateMappingOpen(true)}>
//             Create Mapping
//           </Button>
//           <Button size="sm" onClick={() => onLinkField(selection)}>
//             Link to Field
//           </Button>
//         </div>
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
//       {renderHeader()}

//       <div className="flex flex-1 overflow-hidden">
//         {/* Sidebar for Desktop */}
//         <aside className="hidden md:block w-80 bg-white border-r p-4 space-y-4 overflow-y-auto">
//           <div>
//             <div className="flex justify-between items-center mb-2">
//               <h3 className="text-sm font-semibold text-gray-600">Sheets</h3>
//             </div>
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
//             <div className="flex justify-between items-center mb-2">
//               <h3 className="text-sm font-semibold text-gray-600">
//                 Named Ranges
//               </h3>
//               <Button
//                 size="sm"
//                 variant="ghost"
//                 onClick={() => setIsCreateNamedRangeOpen(true)}
//               >
//                 <Plus className="h-4 w-4" />
//               </Button>
//             </div>
//             <div className="space-y-1">
//               {namedRanges.map((nr) => (
//                 <div
//                   key={nr.id}
//                   className="p-2 text-xs bg-gray-100 rounded flex justify-between items-start cursor-pointer hover:bg-gray-200 group"
//                   onClick={() => handleNamedRangeClick(nr)}
//                 >
//                   <span className="font-medium py-1">{nr.name}</span>
//                   <div className="flex flex-col items-center gap-1">
//                     <Badge
//                       variant="outline"
//                       className="text-xs whitespace-nowrap"
//                     >
//                       {nr.range}
//                     </Badge>
//                     <div className="opacity-0 group-hover:opacity-100 flex gap-1">
//                       <Button
//                         size="sm"
//                         variant="ghost"
//                         className="h-6 w-6 p-0"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleEditNamedRange(nr);
//                         }}
//                       >
//                         <Edit className="h-3 w-3" />
//                       </Button>
//                       <Button
//                         size="sm"
//                         variant="ghost"
//                         className="h-6 w-6 p-0"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleDeleteNamedRange(nr.id);
//                         }}
//                       >
//                         <Trash2 className="h-3 w-3" />
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="pt-4 border-t">
//             <div className="flex justify-between items-center mb-2">
//               <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1">
//                 <List className="h-4 w-4" /> Active Mappings
//               </h3>
//               <Button
//                 size="sm"
//                 variant="ghost"
//                 onClick={() => selection && setIsCreateMappingOpen(true)}
//                 disabled={!selection}
//               >
//                 <Plus className="h-4 w-4" />
//               </Button>
//             </div>
//             <div className="space-y-2">
//               {mappings
//                 .filter((m) => m.sheet === selectedSheet)
//                 .map((map) => (
//                   <div
//                     key={map.id}
//                     className={`p-2 text-xs rounded border-l-4 ${map.color} group`}
//                   >
//                     <div className="flex justify-between items-start">
//                       <div>
//                         <p className="font-medium">{map.destinationField}</p>
//                         <p className="text-gray-600">{`${map.sheet}!${
//                           currentSheetData[map.start.row]?.[map.start.col]
//                         }:${currentSheetData[map.end.row]?.[map.end.col]}`}</p>
//                         {map.transform && (
//                           <p className="text-gray-500">
//                             Transform: {map.transform}
//                           </p>
//                         )}
//                       </div>
//                       <div className="opacity-0 group-hover:opacity-100 flex gap-1">
//                         <Button
//                           size="sm"
//                           variant="ghost"
//                           className="h-6 w-6 p-0"
//                           onClick={() => handleEditMapping(map)}
//                         >
//                           <Edit className="h-3 w-3" />
//                         </Button>
//                         <Button
//                           size="sm"
//                           variant="ghost"
//                           className="h-6 w-6 p-0"
//                           onClick={() => handleDeleteMapping(map.id)}
//                         >
//                           <Trash2 className="h-3 w-3" />
//                         </Button>
//                       </div>
//                     </div>
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
//               <div className="flex justify-between items-center mb-2">
//                 <h3 className="text-sm font-semibold text-gray-600">
//                   Sheets
//                 </h3>
//               </div>
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
//             <div className="pt-4 border-t">
//               <div className="flex justify-between items-center mb-2">
//                 <h3 className="text-sm font-semibold text-gray-600">
//                   Named Ranges
//                 </h3>
//                 <Button
//                   size="sm"
//                   variant="ghost"
//                   onClick={() => setIsCreateNamedRangeOpen(true)}
//                 >
//                   <Plus className="h-4 w-4" />
//                 </Button>
//               </div>
//               <div className="space-y-1">
//                 {namedRanges.map((nr) => (
//                   <div
//                     key={nr.id}
//                     className="p-2 text-xs bg-gray-100 rounded flex justify-between items-start cursor-pointer hover:bg-gray-200 group"
//                     onClick={() => handleNamedRangeClick(nr)}
//                   >
//                     <span className="font-medium py-1">{nr.name}</span>
//                     <div className="flex flex-col items-center gap-1">
//                       <Badge
//                         variant="outline"
//                         className="text-xs whitespace-nowrap"
//                       >
//                         {nr.range}
//                       </Badge>
//                       <div className="group-hover:opacity-105 flex gap-1">
//                         <Button
//                           size="sm"
//                           variant="ghost"
//                           className="h-6 w-6 p-0"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleEditNamedRange(nr);
//                           }}
//                         >
//                           <Edit className="h-3 w-3" />
//                         </Button>
//                         <Button
//                           size="sm"
//                           variant="ghost"
//                           className="h-6 w-6 p-0"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleDeleteNamedRange(nr.id);
//                           }}
//                         >
//                           <Trash2 className="h-3 w-3" />
//                         </Button>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//             <div className="pt-4 border-t">
//               <div className="flex justify-between items-center mb-2">
//                 <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1">
//                   <List className="h-4 w-4" /> Active Mappings
//                 </h3>
//                 <Button
//                   size="sm"
//                   variant="ghost"
//                   onClick={() => selection && setIsCreateMappingOpen(true)}
//                   disabled={!selection}
//                 >
//                   <Plus className="h-4 w-4" />
//                 </Button>
//               </div>
//               <div className="space-y-2">
//                 {mappings
//                   .filter((m) => m.sheet === selectedSheet)
//                   .map((map) => (
//                     <div
//                       key={map.id}
//                       className={`p-2 text-xs rounded border-l-4 ${map.color} group`}
//                     >
//                       <div className="flex justify-between items-start">
//                         <div>
//                           <p className="font-medium">{map.destinationField}</p>
//                           <p className="text-gray-600">{`${map.sheet}!${
//                             currentSheetData[map.start.row]?.[map.start.col]
//                           }:${currentSheetData[map.end.row]?.[map.end.col]}`}</p>
//                           {map.transform && (
//                             <p className="text-gray-500">
//                               Transform: {map.transform}
//                             </p>
//                           )}
//                         </div>
//                         <div className="opacity-0 group-hover:opacity-100 flex gap-1">
//                           <Button
//                             size="sm"
//                             variant="ghost"
//                             className="h-6 w-6 p-0"
//                             onClick={() => handleEditMapping(map)}
//                           >
//                             <Edit className="h-3 w-3" />
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="ghost"
//                             className="h-6 w-6 p-0"
//                             onClick={() => handleDeleteMapping(map.id)}
//                           >
//                             <Trash2 className="h-3 w-3" />
//                           </Button>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//               </div>
//             </div>
//           </div>
//         </SheetContent>
//       </Sheet>

//       {renderSaveDialog()}

//       {/* Create Named Range Dialog */}
//       <Dialog open={isCreateNamedRangeOpen} onOpenChange={setIsCreateNamedRangeOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Create Named Range</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="name">Name</Label>
//               <Input
//                 id="name"
//                 value={newNamedRangeName}
//                 onChange={(e) => setNewNamedRangeName(e.target.value)}
//                 placeholder="Enter name"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="range">Range</Label>
//               <Input
//                 id="range"
//                 value={newNamedRangeRange}
//                 onChange={(e) => setNewNamedRangeRange(e.target.value)}
//                 placeholder="e.g. Sheet1!A1:B5"
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsCreateNamedRangeOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleCreateNamedRange}>Create</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Edit Named Range Dialog */}
//       <Dialog open={isEditNamedRangeOpen} onOpenChange={setIsEditNamedRangeOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Edit Named Range</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="edit-name">Name</Label>
//               <Input
//                 id="edit-name"
//                 value={newNamedRangeName}
//                 onChange={(e) => setNewNamedRangeName(e.target.value)}
//                 placeholder="Enter name"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="edit-range">Range</Label>
//               <Input
//                 id="edit-range"
//                 value={newNamedRangeRange}
//                 onChange={(e) => setNewNamedRangeRange(e.target.value)}
//                 placeholder="e.g. Sheet1!A1:B5"
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsEditNamedRangeOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleUpdateNamedRange}>Update</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Create Mapping Dialog */}
//       <Dialog open={isCreateMappingOpen} onOpenChange={setIsCreateMappingOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Create Mapping</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="destination">Destination Field</Label>
//               <Input
//                 id="destination"
//                 value={newMappingDestinationField}
//                 onChange={(e) => setNewMappingDestinationField(e.target.value)}
//                 placeholder="Enter destination field name"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="transform">Transform</Label>
//               <Select value={newMappingTransform} onValueChange={setNewMappingTransform}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select transform" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="sum">Sum</SelectItem>
//                   <SelectItem value="average">Average</SelectItem>
//                   <SelectItem value="count">Count</SelectItem>
//                   <SelectItem value="max">Max</SelectItem>
//                   <SelectItem value="min">Min</SelectItem>
//                   <SelectItem value="first">First</SelectItem>
//                   <SelectItem value="last">Last</SelectItem>
//                   <SelectItem value="concat">Concatenate</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             {selection && (
//               <div className="p-2 bg-gray-100 rounded">
//                 <p className="text-sm font-medium">Selected Range:</p>
//                 <p className="text-sm">{getSelectionText()}</p>
//               </div>
//             )}
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsCreateMappingOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleCreateMapping}>Create</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Edit Mapping Dialog */}
//       <Dialog open={isEditMappingOpen} onOpenChange={setIsEditMappingOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Edit Mapping</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="edit-destination">Destination Field</Label>
//               <Input
//                 id="edit-destination"
//                 value={newMappingDestinationField}
//                 onChange={(e) => setNewMappingDestinationField(e.target.value)}
//                 placeholder="Enter destination field name"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="edit-transform">Transform</Label>
//               <Select value={newMappingTransform} onValueChange={setNewMappingTransform}>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select transform" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="sum">Sum</SelectItem>
//                   <SelectItem value="average">Average</SelectItem>
//                   <SelectItem value="count">Count</SelectItem>
//                   <SelectItem value="max">Max</SelectItem>
//                   <SelectItem value="min">Min</SelectItem>
//                   <SelectItem value="first">First</SelectItem>
//                   <SelectItem value="last">Last</SelectItem>
//                   <SelectItem value="concat">Concatenate</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             {editingMapping && (
//               <div className="p-2 bg-gray-100 rounded">
//                 <p className="text-sm font-medium">Mapped Range:</p>
//                 <p className="text-sm">{`${editingMapping.sheet}!${
//                   currentSheetData[editingMapping.start.row]?.[editingMapping.start.col]
//                 }:${currentSheetData[editingMapping.end.row]?.[editingMapping.end.col]}`}</p>
//               </div>
//             )}
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsEditMappingOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleUpdateMapping}>Update</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
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






// ###############################################################################################






// import React, { useState, useCallback, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
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
//   Plus,
//   Edit,
//   Trash2,
//   Save,
//   X,
//   Database,
//   CheckCircle,
//   AlertCircle,
//   Loader2,
// } from "lucide-react";
// import {
//   Workbook,
//   SheetData,
//   Selection,
//   Mapping,
//   NamedRange,
// } from "../../types/audit-workbooks/types";
// import { useToast } from "@/hooks/use-toast";
// import {
//   SaveSheetRequest,
//   SaveWorkbookRequest,
//   workbookApi,
// } from "@/lib/api/workbookApi";

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

// // Define helpers outside the component
// const excelColToZeroIndex = (colLetter: string): number => {
//   let result = 0;
//   for (let i = 0; i < colLetter.length; i++) {
//     result = result * 26 + (colLetter.charCodeAt(i) - "A".charCodeAt(0) + 1);
//   }
//   return result - 1;
// };

// const zeroIndexToExcelCol = (colIndex: number): string => {
//   let colLetter = "";
//   let tempColIndex = colIndex;

//   do {
//     const remainder = tempColIndex % 26;
//     colLetter = String.fromCharCode(65 + remainder) + colLetter;
//     tempColIndex = Math.floor(tempColIndex / 26) - 1;
//   } while (tempColIndex >= 0);

//   return colLetter;
// };

// interface ExcelViewerProps {
//   workbook: Workbook;
//   mappings: Mapping[];
//   namedRanges: NamedRange[];
//   onBack: () => void;
//   onLinkField: (selection: Selection) => void;
//   onLinkSheet: () => void;
//   onLinkWorkbook: () => void;
//   onReupload: () => void;
//   onViewAuditLog: () => void;
//   onCreateMapping: (mapping: Mapping) => void;
//   onUpdateMapping: (id: string, mapping: Partial<Mapping>) => void;
//   onDeleteMapping: (id: string) => void;
//   onCreateNamedRange: (namedRange: NamedRange) => void;
//   onUpdateNamedRange: (id: string, namedRange: Partial<NamedRange>) => void;
//   onDeleteNamedRange: (id: string) => void;
//   isFullscreenMode?: boolean;
//   onToggleFullscreen?: () => void;
// }

// export const ExcelViewer: React.FC<ExcelViewerProps> = ({
//   workbook,
//   mappings,
//   namedRanges,
//   onBack,
//   onLinkField,
//   onLinkSheet,
//   onLinkWorkbook,
//   onReupload,
//   onViewAuditLog,
//   onCreateMapping,
//   onUpdateMapping,
//   onDeleteMapping,
//   onCreateNamedRange,
//   onUpdateNamedRange,
//   onDeleteNamedRange,
//   isFullscreenMode = false,
//   onToggleFullscreen,
// }) => {
//   const { toast } = useToast();
//   const sheetData: SheetData = workbook?.fileData || {};
//   const sheetNames = Object.keys(sheetData);

//   const [selectedSheet, setSelectedSheet] = useState<string>(
//     sheetNames[0] || "Balance_Sheet"
//   );
//   const [selection, setSelection] = useState<Selection | null>(null);
//   const [isSelecting, setIsSelecting] = useState(false);

//   // Save dialog states
//   const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
//   const [saveType, setSaveType] = useState<"workbook" | "sheet">("workbook");
//   const [isSaving, setIsSaving] = useState(false);

//   // State for managing named ranges
//   const [isCreateNamedRangeOpen, setIsCreateNamedRangeOpen] = useState(false);
//   const [isEditNamedRangeOpen, setIsEditNamedRangeOpen] = useState(false);
//   const [editingNamedRange, setEditingNamedRange] = useState<NamedRange | null>(
//     null
//   );
//   const [newNamedRangeName, setNewNamedRangeName] = useState("");
//   const [newNamedRangeRange, setNewNamedRangeRange] = useState("");

//   // State for managing mappings
//   const [isCreateMappingOpen, setIsCreateMappingOpen] = useState(false);
//   const [isEditMappingOpen, setIsEditMappingOpen] = useState(false);
//   const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
//   const [newMappingDestinationField, setNewMappingDestinationField] =
//     useState("");
//   const [newMappingTransform, setNewMappingTransform] = useState("sum");

//   const currentSheetData = sheetData[selectedSheet] || [];

//   /**
//    * Save entire workbook to backend
//    */
//   const handleSaveWorkbook = async () => {
//     if (!workbook) {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: "No workbook data available to save",
//       });
//       return;
//     }

//     setIsSaving(true);

//     try {
//       const request: SaveWorkbookRequest = {
//         workbookId: workbook.id,
//         workbookName: workbook.name,
//         version: workbook.version,
//         sheetData: sheetData,
//         metadata: {
//           uploadedDate: workbook.uploadedDate,
//           lastModifiedBy: workbook.lastModifiedBy || "Current User",
//           lastModified: new Date().toISOString(),
//         },
//       };

//       const response = await workbookApi.saveWorkbook(request);

//       if (response.success) {
//         toast({
//           title: "Success",
//           description: "Workbook saved successfully to database",
//         });
//         setIsSaveDialogOpen(false);
//       } else {
//         throw new Error(response.error || "Failed to save workbook");
//       }
//     } catch (error) {
//       console.error("Error saving workbook:", error);
//       toast({
//         variant: "destructive",
//         title: "Save Failed",
//         description:
//           error instanceof Error ? error.message : "Unknown error occurred",
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   /**
//    * Save current sheet to backend
//    */
//   const handleSaveSheet = async () => {
//     if (!workbook || !selectedSheet) {
//       toast({
//         variant: "destructive",
//         title: "Error",
//         description: "No sheet data available to save",
//       });
//       return;
//     }

//     setIsSaving(true);

//     try {
//       const request: SaveSheetRequest = {
//         workbookId: workbook.id,
//         workbookName: workbook.name,
//         sheetName: selectedSheet,
//         sheetData: sheetData[selectedSheet] || [],
//         metadata: {
//           uploadedDate: workbook.uploadedDate,
//           lastModifiedBy: workbook.lastModifiedBy || "Current User",
//           lastModified: new Date().toISOString(),
//         },
//       };

//       const response = await workbookApi.saveSheet(request);

//       if (response.success) {
//         toast({
//           title: "Success",
//           description: `Sheet "${selectedSheet}" saved successfully to database`,
//         });
//         setIsSaveDialogOpen(false);
//       } else {
//         throw new Error(response.error || "Failed to save sheet");
//       }
//     } catch (error) {
//       console.error("Error saving sheet:", error);
//       toast({
//         variant: "destructive",
//         title: "Save Failed",
//         description:
//           error instanceof Error ? error.message : "Unknown error occurred",
//       });
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   /**
//    * Open save dialog
//    */
//   const openSaveDialog = (type: "workbook" | "sheet") => {
//     setSaveType(type);
//     setIsSaveDialogOpen(true);
//   };

//   /**
//    * Handle save confirmation
//    */
//   const handleSaveConfirm = () => {
//     if (saveType === "workbook") {
//       handleSaveWorkbook();
//     } else {
//       handleSaveSheet();
//     }
//   };

//   const handleMouseDown = (excelRowNumber: number, colIndexFromMap: number) => {
//     setIsSelecting(true);
//     // The `colIndexFromMap` is off by +1 from the actual 0-indexed Excel column.
//     // So, if B (Excel col 1) generates colIndexFromMap 2, we need to subtract 1.
//     const correct0IndexedCol = colIndexFromMap - 1;

//     const newSelection = {
//       sheet: selectedSheet,
//       start: { row: excelRowNumber, col: correct0IndexedCol },
//       end: { row: excelRowNumber, col: correct0IndexedCol },
//     };
//     setSelection(newSelection);
//     console.log(
//       `Mouse Down: Excel Row ${excelRowNumber}, CORRECT 0-indexed Col ${correct0IndexedCol}`
//     );
//   };

//   const handleMouseEnter = (
//     excelRowNumber: number,
//     colIndexFromMap: number
//   ) => {
//     if (isSelecting && selection) {
//       const correct0IndexedCol = colIndexFromMap - 1;
//       setSelection({
//         ...selection,
//         end: { row: excelRowNumber, col: correct0IndexedCol },
//       });
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
//     (excelRowNumber: number, colIndexFromMap: number) => {
//       // For highlight, we also need to adjust the incoming colIndex for comparison
//       const correct0IndexedCol = colIndexFromMap - 1;

//       let className = "min-w-[100px] cursor-pointer select-none relative ";
//       if (selection && selection.sheet === selectedSheet) {
//         const { start, end } = selection;
//         const minRow = Math.min(start.row, end.row);
//         const maxRow = Math.max(start.row, end.row);
//         const minCol = Math.min(start.col, end.col);
//         const maxCol = Math.max(start.col, end.col);

//         if (
//           excelRowNumber >= minRow &&
//           excelRowNumber <= maxRow &&
//           correct0IndexedCol >= minCol &&
//           correct0IndexedCol <= maxCol
//         ) {
//           className += "ring-2 ring-blue-500 bg-blue-50 ";
//         }
//       }
//       // The mapping logic in getCellClassName should also use correct0IndexedCol
//       const mapping = mappings.find(
//         (m) =>
//           m.sheet === selectedSheet &&
//           excelRowNumber >= m.start.row &&
//           excelRowNumber <= m.end.row &&
//           correct0IndexedCol >= m.start.col &&
//           correct0IndexedCol <= m.end.col
//       );
//       if (mapping) {
//         className += `${mapping.color} `;
//       }
//       return className;
//     },
//     [selection, selectedSheet, mappings]
//   );

//   const getSelectionText = () => {
//     if (!selection) return "";
//     const { start, end, sheet } = selection;

//     console.log("Selection in getSelectionText:", selection);

//     const actualMinColIndex = Math.min(start.col, end.col);
//     console.log(
//       `Actual min 0-indexed Col: ${actualMinColIndex}, Converted to Excel Letter: ${zeroIndexToExcelCol(
//         actualMinColIndex
//       )}`
//     );
//     const actualMaxColIndex = Math.max(start.col, end.col);
//     const actualMinRowNumber = Math.min(start.row, end.row);
//     const actualMaxRowNumber = Math.max(start.row, end.row);

//     const displayRangeStartColLetter = zeroIndexToExcelCol(actualMinColIndex);
//     const displayRangeEndColLetter = zeroIndexToExcelCol(actualMaxColIndex);

//     const displayRangeStart = `${displayRangeStartColLetter}${actualMinRowNumber}`;
//     const displayRangeEnd = `${displayRangeEndColLetter}${actualMaxRowNumber}`;

//     if (
//       actualMinColIndex === actualMaxColIndex &&
//       actualMinRowNumber === actualMaxRowNumber
//     ) {
//       return `${sheet}!${displayRangeStart}`;
//     }

//     return `${sheet}!${displayRangeStart}:${displayRangeEnd}`;
//   };

//   const handleNamedRangeClick = (namedRange: NamedRange) => {
//     const [sheetName, range] = namedRange.range.split("!");
//     const [startCell, endCell] = range.split(":");
//     if (sheetName && startCell) {
//       setSelectedSheet(sheetName);

//       // Parse start cell
//       const startColLetter = startCell.match(/[A-Z]+/)?.[0] || "A";
//       const startRowNumber = parseInt(startCell.match(/\d+/)?.[0] || "1", 10);
//       const startCol = excelColToZeroIndex(startColLetter);
//       const startRow = startRowNumber;

//       let endCol = startCol;
//       let endRow = startRow;

//       // Parse end cell if it exists
//       if (endCell) {
//         const endColLetter = endCell.match(/[A-Z]+/)?.[0] || "A";
//         const endRowNumber = parseInt(endCell.match(/\d+/)?.[0] || "1", 10);
//         endCol = excelColToZeroIndex(endColLetter);
//         endRow = endRowNumber;
//       }

//       const newSelection = {
//         sheet: sheetName,
//         start: { row: startRow, col: startCol },
//         end: { row: endRow, col: endCol },
//       };
//       setSelection(newSelection);
//     }
//   };

//   const handleCreateNamedRange = () => {
//     if (!newNamedRangeName || !newNamedRangeRange) return;

//     const newNamedRange: NamedRange = {
//       id: Date.now().toString(),
//       name: newNamedRangeName,
//       range: newNamedRangeRange,
//     };

//     onCreateNamedRange(newNamedRange);
//     setNewNamedRangeName("");
//     setNewNamedRangeRange("");
//     setIsCreateNamedRangeOpen(false);
//   };

//   const handleEditNamedRange = (namedRange: NamedRange) => {
//     setEditingNamedRange(namedRange);
//     setNewNamedRangeName(namedRange.name);
//     setNewNamedRangeRange(namedRange.range);
//     setIsEditNamedRangeOpen(true);
//   };

//   const handleUpdateNamedRange = () => {
//     if (!editingNamedRange || !newNamedRangeName || !newNamedRangeRange) return;

//     onUpdateNamedRange(editingNamedRange.id, {
//       name: newNamedRangeName,
//       range: newNamedRangeRange,
//     });

//     setEditingNamedRange(null);
//     setNewNamedRangeName("");
//     setNewNamedRangeRange("");
//     setIsEditNamedRangeOpen(false);
//   };

//   const handleDeleteNamedRange = (id: string) => {
//     onDeleteNamedRange(id);
//   };

//   const handleCreateMapping = () => {
//     if (!selection || !newMappingDestinationField) return;

//     const newMapping: Mapping = {
//       id: Date.now().toString(),
//       sheet: selection.sheet,
//       start: selection.start,
//       end: selection.end,
//       destinationField: newMappingDestinationField,
//       transform: newMappingTransform,
//       color: generateColor(),
//     };

//     onCreateMapping(newMapping);
//     setNewMappingDestinationField("");
//     setNewMappingTransform("sum");
//     setIsCreateMappingOpen(false);
//   };

//   const handleEditMapping = (mapping: Mapping) => {
//     setEditingMapping(mapping);
//     setNewMappingDestinationField(mapping.destinationField);
//     setNewMappingTransform(mapping.transform);
//     setIsEditMappingOpen(true);
//   };

//   const handleUpdateMapping = () => {
//     if (!editingMapping || !newMappingDestinationField) return;

//     onUpdateMapping(editingMapping.id, {
//       destinationField: newMappingDestinationField,
//       transform: newMappingTransform,
//     });

//     setEditingMapping(null);
//     setNewMappingDestinationField("");
//     setNewMappingTransform("sum");
//     setIsEditMappingOpen(false);
//   };

//   const handleDeleteMapping = (id: string) => {
//     onDeleteMapping(id);
//   };

//   const renderHeader = () => (
//     <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
//       <div className="flex items-center space-x-4">
//         <Button variant="ghost" size="sm" onClick={onBack}>
//           <ArrowLeft className="h-4 w-4" />
//         </Button>
//         <div>
//           <h1 className="text-lg font-semibold">{workbook.name}</h1>
//           <p className="text-xs text-gray-500">
//             Version {workbook.version} • Last modified{" "}
//             {workbook.lastModified || workbook.uploadedDate}
//           </p>
//         </div>
//       </div>
//       <div className="flex items-center space-x-2">
//         {/* Save Buttons */}
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={() => openSaveDialog("sheet")}
//           className="text-blue-600 border-blue-600 hover:bg-blue-50"
//         >
//           <Database className="h-4 w-4 mr-2" />
//           Save Sheet
//         </Button>
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={() => openSaveDialog("workbook")}
//           className="text-blue-600 border-blue-600 hover:bg-blue-50"
//         >
//           <Database className="h-4 w-4 mr-2" />
//           Save Workbook
//         </Button>

//         {onToggleFullscreen && (
//           <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
//             <Maximize2 className="h-4 w-4" />
//           </Button>
//         )}
//         <Button variant="outline" size="sm" onClick={onViewAuditLog}>
//           <History className="h-4 w-4 mr-2" />
//           Audit Log
//         </Button>
//         <Button variant="outline" size="sm" onClick={onReupload}>
//           <Upload className="h-4 w-4 mr-2" />
//           Re-upload
//         </Button>
//         <Button variant="outline" size="sm">
//           <Settings className="h-4 w-4" />
//         </Button>
//       </div>
//     </header>
//   );

//   // Save Confirmation Dialog
//   const renderSaveDialog = () => (
//     <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>
//             Save {saveType === "workbook" ? "Workbook" : "Sheet"} to Database
//           </DialogTitle>
//         </DialogHeader>

//         <div className="space-y-4 py-4">
//           <div className="space-y-2">
//             <Label>What will be saved:</Label>
//             <div className="p-3 bg-gray-50 rounded-md space-y-2">
//               {saveType === "workbook" ? (
//                 <>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>Workbook: {workbook?.name}</span>
//                   </div>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>All Sheets: {sheetNames.length} sheet(s)</span>
//                   </div>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>Version: {workbook?.version}</span>
//                   </div>
//                   <div className="flex items-center text-sm text-gray-600 mt-2">
//                     <AlertCircle className="h-4 w-4 mr-2" />
//                     <span>
//                       Total rows:{" "}
//                       {Object.values(sheetData).reduce(
//                         (sum, sheet) => sum + sheet.length,
//                         0
//                       )}
//                     </span>
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>Sheet: {selectedSheet}</span>
//                   </div>
//                   <div className="flex items-center text-sm">
//                     <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
//                     <span>Workbook: {workbook?.name}</span>
//                   </div>
//                   <div className="flex items-center text-sm text-gray-600 mt-2">
//                     <AlertCircle className="h-4 w-4 mr-2" />
//                     <span>
//                       Total rows: {sheetData[selectedSheet]?.length || 0}
//                     </span>
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>

//           {isSaving && (
//             <div className="flex items-center justify-center p-4">
//               <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
//               <span className="ml-2 text-sm text-gray-600">
//                 Saving to database...
//               </span>
//             </div>
//           )}
//         </div>

//         <DialogFooter>
//           <Button
//             variant="outline"
//             onClick={() => setIsSaveDialogOpen(false)}
//             disabled={isSaving}
//           >
//             Cancel
//           </Button>
//           <Button onClick={handleSaveConfirm} disabled={isSaving}>
//             {isSaving ? (
//               <>
//                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                 Saving...
//               </>
//             ) : (
//               <>
//                 <Database className="h-4 w-4 mr-2" />
//                 Confirm Save
//               </>
//             )}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );

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
//           {currentSheetData.slice(1).map((row, dataRowIndex) => {
//             // dataRowIndex is 0-indexed for the *data rows* (e.g., Row1 is at 0, Row2 at 1)
//             const excelRowNumber = dataRowIndex + 1;
//             return (
//               <TableRow key={dataRowIndex}>
//                 {row.map((cell, cellIndex) => (
//                   <TableCell
//                     key={cellIndex}
//                     className={getCellClassName(excelRowNumber, cellIndex)}
//                     onMouseDown={() =>
//                       handleMouseDown(excelRowNumber, cellIndex)
//                     }
//                     onMouseEnter={() =>
//                       handleMouseEnter(excelRowNumber, cellIndex)
//                     }
//                   >
//                     {cell}
//                     {mappings.find(
//                       (m) =>
//                         m.sheet === selectedSheet &&
//                         excelRowNumber === m.start.row &&
//                         cellIndex === m.start.col
//                     ) && (
//                       <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
//                     )}
//                   </TableCell>
//                 ))}
//               </TableRow>
//             );
//           })}
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
//         <div className="flex gap-2">
//           <Button
//             size="sm"
//             variant="outline"
//             onClick={() => setIsCreateMappingOpen(true)}
//           >
//             Create Mapping
//           </Button>
//           <Button size="sm" onClick={() => onLinkField(selection)}>
//             Link to Field
//           </Button>
//         </div>
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
//       {renderHeader()}

//       <div className="flex flex-1 overflow-hidden">
//         {/* Sidebar for Desktop */}
//         <aside className="hidden md:block w-80 bg-white border-r p-4 space-y-4 overflow-y-auto">
//           <div>
//             <div className="flex justify-between items-center mb-2">
//               <h3 className="text-sm font-semibold text-gray-600">Sheets</h3>
//             </div>
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
//             <div className="flex justify-between items-center mb-2">
//               <h3 className="text-sm font-semibold text-gray-600">
//                 Named Ranges
//               </h3>
//               <Button
//                 size="sm"
//                 variant="ghost"
//                 onClick={() => setIsCreateNamedRangeOpen(true)}
//               >
//                 <Plus className="h-4 w-4" />
//               </Button>
//             </div>
//             <div className="space-y-1">
//               {namedRanges.map((nr) => (
//                 <div
//                   key={nr.id}
//                   className="p-2 text-xs bg-gray-100 rounded flex justify-between items-start cursor-pointer hover:bg-gray-200 group"
//                   onClick={() => handleNamedRangeClick(nr)}
//                 >
//                   <span className="font-medium py-1">{nr.name}</span>
//                   <div className="flex flex-col items-center gap-1">
//                     <Badge
//                       variant="outline"
//                       className="text-xs whitespace-nowrap"
//                     >
//                       {nr.range}
//                     </Badge>
//                     <div className="opacity-0 group-hover:opacity-100 flex gap-1">
//                       <Button
//                         size="sm"
//                         variant="ghost"
//                         className="h-6 w-6 p-0"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleEditNamedRange(nr);
//                         }}
//                       >
//                         <Edit className="h-3 w-3" />
//                       </Button>
//                       <Button
//                         size="sm"
//                         variant="ghost"
//                         className="h-6 w-6 p-0"
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleDeleteNamedRange(nr.id);
//                         }}
//                       >
//                         <Trash2 className="h-3 w-3" />
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="pt-4 border-t">
//             <div className="flex justify-between items-center mb-2">
//               <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1">
//                 <List className="h-4 w-4" /> Active Mappings
//               </h3>
//               <Button
//                 size="sm"
//                 variant="ghost"
//                 onClick={() => selection && setIsCreateMappingOpen(true)}
//                 disabled={!selection}
//               >
//                 <Plus className="h-4 w-4" />
//               </Button>
//             </div>
//             <div className="space-y-2">
//               {mappings
//                 .filter((m) => m.sheet === selectedSheet)
//                 .map((map) => (
//                   <div
//                     key={map.id}
//                     className={`p-2 text-xs rounded border-l-4 ${map.color} group`}
//                   >
//                     <div className="flex justify-between items-start">
//                       <div>
//                         <p className="font-medium">{map.destinationField}</p>
//                         <p className="text-gray-600">{`${map.sheet}!${
//                           currentSheetData[map.start.row]?.[map.start.col]
//                         }:${currentSheetData[map.end.row]?.[map.end.col]}`}</p>
//                         {map.transform && (
//                           <p className="text-gray-500">
//                             Transform: {map.transform}
//                           </p>
//                         )}
//                       </div>
//                       <div className="opacity-0 group-hover:opacity-100 flex gap-1">
//                         <Button
//                           size="sm"
//                           variant="ghost"
//                           className="h-6 w-6 p-0"
//                           onClick={() => handleEditMapping(map)}
//                         >
//                           <Edit className="h-3 w-3" />
//                         </Button>
//                         <Button
//                           size="sm"
//                           variant="ghost"
//                           className="h-6 w-6 p-0"
//                           onClick={() => handleDeleteMapping(map.id)}
//                         >
//                           <Trash2 className="h-3 w-3" />
//                         </Button>
//                       </div>
//                     </div>
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
//               <div className="flex justify-between items-center mb-2">
//                 <h3 className="text-sm font-semibold text-gray-600">Sheets</h3>
//               </div>
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
//             <div className="pt-4 border-t">
//               <div className="flex justify-between items-center mb-2">
//                 <h3 className="text-sm font-semibold text-gray-600">
//                   Named Ranges
//                 </h3>
//                 <Button
//                   size="sm"
//                   variant="ghost"
//                   onClick={() => setIsCreateNamedRangeOpen(true)}
//                 >
//                   <Plus className="h-4 w-4" />
//                 </Button>
//               </div>
//               <div className="space-y-1">
//                 {namedRanges.map((nr) => (
//                   <div
//                     key={nr.id}
//                     className="p-2 text-xs bg-gray-100 rounded flex justify-between items-start cursor-pointer hover:bg-gray-200 group"
//                     onClick={() => handleNamedRangeClick(nr)}
//                   >
//                     <span className="font-medium py-1">{nr.name}</span>
//                     <div className="flex flex-col items-center gap-1">
//                       <Badge
//                         variant="outline"
//                         className="text-xs whitespace-nowrap"
//                       >
//                         {nr.range}
//                       </Badge>
//                       <div className="group-hover:opacity-105 flex gap-1">
//                         <Button
//                           size="sm"
//                           variant="ghost"
//                           className="h-6 w-6 p-0"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleEditNamedRange(nr);
//                           }}
//                         >
//                           <Edit className="h-3 w-3" />
//                         </Button>
//                         <Button
//                           size="sm"
//                           variant="ghost"
//                           className="h-6 w-6 p-0"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleDeleteNamedRange(nr.id);
//                           }}
//                         >
//                           <Trash2 className="h-3 w-3" />
//                         </Button>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//             <div className="pt-4 border-t">
//               <div className="flex justify-between items-center mb-2">
//                 <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1">
//                   <List className="h-4 w-4" /> Active Mappings
//                 </h3>
//                 <Button
//                   size="sm"
//                   variant="ghost"
//                   onClick={() => selection && setIsCreateMappingOpen(true)}
//                   disabled={!selection}
//                 >
//                   <Plus className="h-4 w-4" />
//                 </Button>
//               </div>
//               <div className="space-y-2">
//                 {mappings
//                   .filter((m) => m.sheet === selectedSheet)
//                   .map((map) => (
//                     <div
//                       key={map.id}
//                       className={`p-2 text-xs rounded border-l-4 ${map.color} group`}
//                     >
//                       <div className="flex justify-between items-start">
//                         <div>
//                           <p className="font-medium">{map.destinationField}</p>
//                           <p className="text-gray-600">{`${map.sheet}!${
//                             currentSheetData[map.start.row]?.[map.start.col]
//                           }:${
//                             currentSheetData[map.end.row]?.[map.end.col]
//                           }`}</p>
//                           {map.transform && (
//                             <p className="text-gray-500">
//                               Transform: {map.transform}
//                             </p>
//                           )}
//                         </div>
//                         <div className="opacity-0 group-hover:opacity-100 flex gap-1">
//                           <Button
//                             size="sm"
//                             variant="ghost"
//                             className="h-6 w-6 p-0"
//                             onClick={() => handleEditMapping(map)}
//                           >
//                             <Edit className="h-3 w-3" />
//                           </Button>
//                           <Button
//                             size="sm"
//                             variant="ghost"
//                             className="h-6 w-6 p-0"
//                             onClick={() => handleDeleteMapping(map.id)}
//                           >
//                             <Trash2 className="h-3 w-3" />
//                           </Button>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//               </div>
//             </div>
//           </div>
//         </SheetContent>
//       </Sheet>

//       {renderSaveDialog()}

//       {/* Create Named Range Dialog */}
//       <Dialog
//         open={isCreateNamedRangeOpen}
//         onOpenChange={setIsCreateNamedRangeOpen}
//       >
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Create Named Range</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="name">Name</Label>
//               <Input
//                 id="name"
//                 value={newNamedRangeName}
//                 onChange={(e) => setNewNamedRangeName(e.target.value)}
//                 placeholder="Enter name"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="range">Range</Label>
//               <Input
//                 id="range"
//                 value={newNamedRangeRange}
//                 onChange={(e) => setNewNamedRangeRange(e.target.value)}
//                 placeholder="e.g. Sheet1!A1:B5"
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsCreateNamedRangeOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button onClick={handleCreateNamedRange}>Create</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Edit Named Range Dialog */}
//       <Dialog
//         open={isEditNamedRangeOpen}
//         onOpenChange={setIsEditNamedRangeOpen}
//       >
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Edit Named Range</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="edit-name">Name</Label>
//               <Input
//                 id="edit-name"
//                 value={newNamedRangeName}
//                 onChange={(e) => setNewNamedRangeName(e.target.value)}
//                 placeholder="Enter name"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="edit-range">Range</Label>
//               <Input
//                 id="edit-range"
//                 value={newNamedRangeRange}
//                 onChange={(e) => setNewNamedRangeRange(e.target.value)}
//                 placeholder="e.g. Sheet1!A1:B5"
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsEditNamedRangeOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button onClick={handleUpdateNamedRange}>Update</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Create Mapping Dialog */}
//       <Dialog open={isCreateMappingOpen} onOpenChange={setIsCreateMappingOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Create Mapping</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="destination">Destination Field</Label>
//               <Input
//                 id="destination"
//                 value={newMappingDestinationField}
//                 onChange={(e) => setNewMappingDestinationField(e.target.value)}
//                 placeholder="Enter destination field name"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="transform">Transform</Label>
//               <Select
//                 value={newMappingTransform}
//                 onValueChange={setNewMappingTransform}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select transform" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="sum">Sum</SelectItem>
//                   <SelectItem value="average">Average</SelectItem>
//                   <SelectItem value="count">Count</SelectItem>
//                   <SelectItem value="max">Max</SelectItem>
//                   <SelectItem value="min">Min</SelectItem>
//                   <SelectItem value="first">First</SelectItem>
//                   <SelectItem value="last">Last</SelectItem>
//                   <SelectItem value="concat">Concatenate</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             {selection && (
//               <div className="p-2 bg-gray-100 rounded">
//                 <p className="text-sm font-medium">Selected Range:</p>
//                 <p className="text-sm">{getSelectionText()}</p>
//               </div>
//             )}
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsCreateMappingOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button onClick={handleCreateMapping}>Create</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Edit Mapping Dialog */}
//       <Dialog open={isEditMappingOpen} onOpenChange={setIsEditMappingOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Edit Mapping</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-4 py-2">
//             <div className="space-y-2">
//               <Label htmlFor="edit-destination">Destination Field</Label>
//               <Input
//                 id="edit-destination"
//                 value={newMappingDestinationField}
//                 onChange={(e) => setNewMappingDestinationField(e.target.value)}
//                 placeholder="Enter destination field name"
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="edit-transform">Transform</Label>
//               <Select
//                 value={newMappingTransform}
//                 onValueChange={setNewMappingTransform}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select transform" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="sum">Sum</SelectItem>
//                   <SelectItem value="average">Average</SelectItem>
//                   <SelectItem value="count">Count</SelectItem>
//                   <SelectItem value="max">Max</SelectItem>
//                   <SelectItem value="min">Min</SelectItem>
//                   <SelectItem value="first">First</SelectItem>
//                   <SelectItem value="last">Last</SelectItem>
//                   <SelectItem value="concat">Concatenate</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             {editingMapping && (
//               <div className="p-2 bg-gray-100 rounded">
//                 <p className="text-sm font-medium">Mapped Range:</p>
//                 <p className="text-sm">{`${editingMapping.sheet}!${
//                   currentSheetData[editingMapping.start.row]?.[
//                     editingMapping.start.col
//                   ]
//                 }:${
//                   currentSheetData[editingMapping.end.row]?.[
//                     editingMapping.end.col
//                   ]
//                 }`}</p>
//               </div>
//             )}
//           </div>
//           <DialogFooter>
//             <Button
//               variant="outline"
//               onClick={() => setIsEditMappingOpen(false)}
//             >
//               Cancel
//             </Button>
//             <Button onClick={handleUpdateMapping}>Update</Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
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







// ###############################################################################################################





import React, { useState, useCallback, useEffect } from "react";
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
} from "lucide-react";
import {
  Workbook,
  SheetData,
  Selection,
  Mapping,
  NamedRange,
} from "../../types/audit-workbooks/types";
import { useToast } from "@/hooks/use-toast";
import {
  SaveSheetRequest,
  SaveWorkbookRequest,
  workbookApi,
} from "@/lib/api/workbookApi";

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

// Define helpers outside the component
const excelColToZeroIndex = (colLetter: string): number => {
  let result = 0;
  for (let i = 0; i < colLetter.length; i++) {
    result = result * 26 + (colLetter.charCodeAt(i) - "A".charCodeAt(0) + 1);
  }
  return result - 1; // Convert to 0-indexed
};

const zeroIndexToExcelCol = (colIndex: number): string => {
  let colLetter = "";
  let tempColIndex = colIndex;

  do {
    const remainder = tempColIndex % 26;
    colLetter = String.fromCharCode(65 + remainder) + colLetter;
    tempColIndex = Math.floor(tempColIndex / 26) - 1;
  } while (tempColIndex >= 0);

  return colLetter;
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
  const { toast } = useToast();
  const sheetData: SheetData = workbook?.fileData || {};
  const sheetNames = Object.keys(sheetData);

  const [selectedSheet, setSelectedSheet] = useState<string>(
    sheetNames[0] || "Balance_Sheet"
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Save dialog states
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveType, setSaveType] = useState<"workbook" | "sheet">("workbook");
  const [isSaving, setIsSaving] = useState(false);

  // State for managing named ranges
  const [isCreateNamedRangeOpen, setIsCreateNamedRangeOpen] = useState(false);
  const [isEditNamedRangeOpen, setIsEditNamedRangeOpen] = useState(false);
  const [editingNamedRange, setEditingNamedRange] = useState<NamedRange | null>(
    null
  );
  const [newNamedRangeName, setNewNamedRangeName] = useState("");
  const [newNamedRangeRange, setNewNamedRangeRange] = useState("");

  // State for managing mappings
  const [isCreateMappingOpen, setIsCreateMappingOpen] = useState(false);
  const [isEditMappingOpen, setIsEditMappingOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [newMappingDestinationField, setNewMappingDestinationField] =
    useState("");
  const [newMappingTransform, setNewMappingTransform] = useState("sum");

  // currentSheetData now includes the prepended column letters and row numbers
  const currentSheetData = sheetData[selectedSheet] || [];

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
      // When saving, we might want to strip the "A,B,C" and "1,2,3" prefixes
      // or ensure the backend can handle them. For now, let's assume the backend
      // expects the data as it is in `fileData`.
      const dataToSave = { ...sheetData };
      // If backend should NOT have the A,B,C / 1,2,3 headers:
      // const cleanedSheetData: SheetData = {};
      // for (const sheetName in sheetData) {
      //   const sheet = sheetData[sheetName];
      //   if (sheet.length > 1) { // If there are header and data rows
      //     cleanedSheetData[sheetName] = sheet.slice(1).map(row => row.slice(1));
      //   } else {
      //     cleanedSheetData[sheetName] = [];
      //   }
      // }

      const request: SaveWorkbookRequest = {
        workbookId: workbook.id,
        workbookName: workbook.name,
        version: workbook.version,
        sheetData: dataToSave, // Use the data directly as it is stored in workbook.fileData
        metadata: {
          uploadedDate: workbook.uploadedDate,
          lastModifiedBy: workbook.lastModifiedBy || "Current User",
          lastModified: new Date().toISOString(),
        },
      };

      const response = await workbookApi.saveWorkbook(request);

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
      // Similar to workbook save, decide if sheetData[selectedSheet] needs cleaning
      const sheetDataToSave = sheetData[selectedSheet] || [];
      // If backend should NOT have the A,B,C / 1,2,3 headers:
      // const cleanedSheetData = sheetDataToSave.length > 1
      //   ? sheetDataToSave.slice(1).map(row => row.slice(1))
      //   : [];

      const request: SaveSheetRequest = {
        workbookId: workbook.id,
        workbookName: workbook.name,
        sheetName: selectedSheet,
        sheetData: sheetDataToSave, // Use the data directly as it is stored
        metadata: {
          uploadedDate: workbook.uploadedDate,
          lastModifiedBy: workbook.lastModifiedBy || "Current User",
          lastModified: new Date().toISOString(),
        },
      };

      const response = await workbookApi.saveSheet(request);

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

  // When mapping / selecting, we need to consider the actual Excel row/col numbers.
  // currentSheetData has structure like:
  // [
  //   ["", "A", "B", "C"], // `excelGridRowIndex = 0` (header row)
  //   ["1", "Data1", "Data2", "Data3"], // `excelGridRowIndex = 1` (Excel Row 1)
  //   ["2", "Data4", "Data5", "Data6"]  // `excelGridRowIndex = 2` (Excel Row 2)
  // ]
  // A cell like "Data1" is at `currentSheetData[1][1]`.
  // Its Excel representation is A1. So, Excel Row Number = 1, Excel Col Index = 0.
  // This means:
  //   excelRowNumber (1-indexed) = excelGridRowIndex
  //   excelColIndex (0-indexed) = excelGridColIndex - 1

  const handleMouseDown = (excelGridRowIndex: number, excelGridColIndex: number) => {
    setIsSelecting(true);
    // Ignore clicks on the row number column (excelGridColIndex === 0)
    // or the top-left empty cell (excelGridRowIndex === 0 && excelGridColIndex === 0)
    // or the column letter header row (excelGridRowIndex === 0)
    if (excelGridColIndex === 0 || excelGridRowIndex === 0) {
      setSelection(null); // Clear selection if clicking on header/row number
      return;
    }

    // Convert grid indices to actual Excel 1-indexed row number and 0-indexed column
    const excelRowNumber = excelGridRowIndex;
    const excelColIndex = excelGridColIndex - 1;

    const newSelection = {
      sheet: selectedSheet,
      start: { row: excelRowNumber, col: excelColIndex },
      end: { row: excelRowNumber, col: excelColIndex },
    };
    setSelection(newSelection);
    console.log(
      `Mouse Down: Excel Row ${excelRowNumber}, Excel Col (0-indexed) ${excelColIndex}`
    );
  };

  const handleMouseEnter = (
    excelGridRowIndex: number,
    excelGridColIndex: number
  ) => {
    if (isSelecting && selection) {
      // Ignore hover on row number column or header row
      if (excelGridColIndex === 0 || excelGridRowIndex === 0) {
        return;
      }
      
      const excelRowNumber = excelGridRowIndex;
      const excelColIndex = excelGridColIndex - 1;

      setSelection({
        ...selection,
        end: { row: excelRowNumber, col: excelColIndex },
      });
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
    (excelGridRowIndex: number, excelGridColIndex: number) => {
      let className = "min-w-[100px] cursor-pointer select-none relative ";

      // Special styling for row number and column letter headers
      if (excelGridColIndex === 0 || excelGridRowIndex === 0) {
        className += "bg-gray-100 font-semibold text-gray-700 sticky ";
        if (excelGridColIndex === 0) { // Row number column
          className += "left-0 z-20 ";
        }
        if (excelGridRowIndex === 0) { // Column letter row
          className += "top-0 z-20 ";
        }
        if (excelGridColIndex === 0 && excelGridRowIndex === 0) { // Top-left corner
          className += "sticky top-0 left-0 z-30 ";
        }
        return className;
      }

      // Convert grid indices to actual Excel 1-indexed row number and 0-indexed column for comparison
      const excelRowNumber = excelGridRowIndex;
      const excelColIndex = excelGridColIndex - 1;

      if (selection && selection.sheet === selectedSheet) {
        const { start, end } = selection;
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);

        if (
          excelRowNumber >= minRow &&
          excelRowNumber <= maxRow &&
          excelColIndex >= minCol &&
          excelColIndex <= maxCol
        ) {
          className += "ring-2 ring-blue-500 bg-blue-50 ";
        }
      }
      
      const mapping = mappings.find(
        (m) =>
          m.sheet === selectedSheet &&
          excelRowNumber >= m.start.row &&
          excelRowNumber <= m.end.row &&
          excelColIndex >= m.start.col &&
          excelColIndex <= m.end.col
      );
      if (mapping) {
        className += `${mapping.color} `;
      }
      return className;
    },
    [selection, selectedSheet, mappings]
  );

  const getSelectionText = () => {
    if (!selection) return "";
    const { start, end, sheet } = selection;

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

      // Parse start cell
      const startColLetter = startCell.match(/[A-Z]+/)?.[0] || "A";
      const startRowNumber = parseInt(startCell.match(/\d+/)?.[0] || "1", 10);
      const startCol = excelColToZeroIndex(startColLetter);
      const startRow = startRowNumber;

      let endCol = startCol;
      let endRow = startRow;

      // Parse end cell if it exists
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
      setSelection(newSelection);
    }
  };

  const handleCreateNamedRange = () => {
    if (!newNamedRangeName || !newNamedRangeRange) return;

    // Validate range format, e.g., "Sheet1!A1" or "Sheet1!A1:B5"
    const rangeRegex = /^[^!]+!([A-Z]+)(\d+)(:([A-Z]+)(\d+))?$/;
    if (!rangeRegex.test(newNamedRangeRange)) {
        toast({
            variant: "destructive",
            title: "Invalid Range Format",
            description: "Please use format like 'Sheet1!A1' or 'Sheet1!A1:B5'",
        });
        return;
    }

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

    // Validate range format
    const rangeRegex = /^[^!]+!([A-Z]+)(\d+)(:([A-Z]+)(\d+))?$/;
    if (!rangeRegex.test(newNamedRangeRange)) {
        toast({
            variant: "destructive",
            title: "Invalid Range Format",
            description: "Please use format like 'Sheet1!A1' or 'Sheet1!A1:B5'",
        });
        return;
    }

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

  const renderHeader = () => (
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
        <Button variant="outline" size="sm" onClick={onReupload}>
          <Upload className="h-4 w-4 mr-2" />
          Re-upload
        </Button>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
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
                        (sum, sheet) => sum + (sheet.length > 0 ? sheet.length - 1 : 0), // Exclude the header row when counting data rows
                        0
                      )} (excluding header rows)
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
                      Total rows: {sheetData[selectedSheet]?.length > 0 ? sheetData[selectedSheet].length - 1 : 0}{" "} (excluding header row)
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

  const renderSpreadsheet = () => {
    if (!currentSheetData || currentSheetData.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg shadow">
          <p className="text-gray-500">No data available for this sheet.</p>
        </div>
      );
    }

    // currentSheetData structure:
    // [
    //   ["", "A", "B", "C", ...], // index 0: Column headers
    //   ["1", "cell", "cell", ...], // index 1: Row 1 data
    //   ["2", "cell", "cell", ...], // index 2: Row 2 data
    //   ...
    // ]

    const columnHeaders = currentSheetData[0]; // This is ["", "A", "B", ...]
    const dataRows = currentSheetData.slice(1); // This is [["1", "cell", ...], ["2", "cell", ...], ...]

    return (
      <div className="w-full bg-white rounded-lg shadow overflow-x-auto mb-1">
        <Table className="border-collapse">
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              {columnHeaders.map((header, excelGridColIndex) => (
                <TableHead 
                  key={excelGridColIndex} 
                  className={getCellClassName(0, excelGridColIndex)} // Use 0 for excelGridRowIndex for headers
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataRows.map((row, dataRowArrayIndex) => {
              // dataRowArrayIndex is 0-indexed for the *dataRows array* (0 for Excel row 1, 1 for Excel row 2)
              // excelGridRowIndex refers to the 0-indexed position in currentSheetData (1 for Excel row 1, 2 for Excel row 2)
              const excelGridRowIndex = dataRowArrayIndex + 1; 
              
              return (
                <TableRow key={dataRowArrayIndex}>
                  {row.map((cell, excelGridColIndex) => (
                    <TableCell
                      key={excelGridColIndex}
                      className={getCellClassName(excelGridRowIndex, excelGridColIndex)}
                      onMouseDown={() =>
                        handleMouseDown(excelGridRowIndex, excelGridColIndex)
                      }
                      onMouseEnter={() =>
                        handleMouseEnter(excelGridRowIndex, excelGridColIndex)
                      }
                    >
                      {cell}
                      {/* Check if this cell is the start of a mapping, adjusted for data-only cells */}
                      {excelGridColIndex > 0 && // Only for actual data cells, not row numbers
                       excelGridRowIndex > 0 && // Only for actual data cells, not column headers
                       mappings.find(
                         (m) =>
                           m.sheet === selectedSheet &&
                           excelGridRowIndex === m.start.row &&
                           (excelGridColIndex - 1) === m.start.col // Adjust for 0-indexed Excel column
                       ) && (
                         <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
                       )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderSelectionFooter = () => {
    if (!selection) return null;
    return (
      <div className="sticky bottom-0 left-0 right-0 mt-4 p-4 bg-blue-100 text-blue-800 rounded-t-lg flex justify-between items-center z-10 shadow-lg">
        <span>
          Selection: <Badge variant="secondary">{getSelectionText()}</Badge>
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCreateMappingOpen(true)}
          >
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
        {/* Fullscreen view has a simplified header or no header */}
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
      {renderHeader()}

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
                        {/* Display mapped range using Excel coordinates for clarity */}
                        <p className="text-gray-600">{`${map.sheet}!${zeroIndexToExcelCol(map.start.col)}${map.start.row}:${zeroIndexToExcelCol(map.end.col)}${map.end.row}`}</p>
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
                          {/* Display mapped range using Excel coordinates for clarity */}
                          <p className="text-gray-600">{`${map.sheet}!${zeroIndexToExcelCol(map.start.col)}${map.start.row}:${zeroIndexToExcelCol(map.end.col)}${map.end.row}`}</p>
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

      {renderSaveDialog()}

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
              <Select
                value={newMappingTransform}
                onValueChange={setNewMappingTransform}
              >
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
            <Button
              variant="outline"
              onClick={() => setIsCreateMappingOpen(false)}
            >
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
              <Select
                value={newMappingTransform}
                onValueChange={setNewMappingTransform}
              >
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
                <p className="text-sm">{`${editingMapping.sheet}!${zeroIndexToExcelCol(editingMapping.start.col)}${editingMapping.start.row}:${zeroIndexToExcelCol(editingMapping.end.col)}${editingMapping.end.row}`}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditMappingOpen(false)}
            >
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
