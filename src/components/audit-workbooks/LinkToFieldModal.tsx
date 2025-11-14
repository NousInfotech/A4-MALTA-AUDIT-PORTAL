import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Selection, Mapping } from "../../types/audit-workbooks/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { type ETBData } from "@/lib/api/extendedTrialBalanceApi";
// Import the utility function
import { zeroIndexToExcelCol } from "./utils"; // Assuming utils.ts is in the same directory

interface LinkToFieldModalProps {
  workbook: any;
  onClose: () => void;
  selection: Selection | null;
  onLink: (workbookid: string, mapping: any) => void;
  etbData: ETBData | null;
  etbLoading: boolean;
  etbError: string | null;
  onRefreshETBData: () => void;
  rowType?: 'etb' | 'working-paper' | 'evidence'; // ✅ NEW: Add rowType for contextual UI
}

const destinationFields = [
  "ppe_nbv_close",
  "total_assets",
  "current_liabilities",
  "revenue",
  "expenses",
  "net_income",
  "cash_flow",
  "depreciation",
  "inventory",
  "accounts_receivable",
];

const transforms = [
  { value: "link", label: "Link" },
  { value: "map", label: "MAP" },
  { value: "sum", label: "SUM" },
  { value: "average", label: "AVERAGE" },
  { value: "first", label: "FIRST" },
  { value: "last", label: "LAST" },
  { value: "count", label: "COUNT" },
  { value: "currency_normalize", label: "Currency Normalization" },
  { value: "text_parse", label: "Text Parsing" },
  { value: "date_format", label: "Date Format" },
];

const validations = [
  { value: "numeric_range", label: "Numeric Range" },
  { value: "not_empty", label: "Not Empty" },
  { value: "is_date", label: "Is Date" },
  { value: "is_number", label: "Is Number" },
  { value: "regex", label: "Regex Pattern" },
];

export const LinkToFieldModal: React.FC<LinkToFieldModalProps> = ({
  workbook,
  onClose,
  selection,
  onLink,
  etbData,
  etbLoading,
  etbError,
  onRefreshETBData,
  rowType = 'etb', // ✅ Default to 'etb' for backward compatibility
}) => {
  const [selectedRowId, setSelectedRowId] = useState<string>("");
  const [transform, setTransform] = useState("sum");
  const [validationType, setValidationType] = useState("");
  const [validationParams, setValidationParams] = useState({
    min: "",
    max: "",
    pattern: "",
  });
  const [isLinking, setIsLinking] = useState(false);
  const { toast } = useToast();

  // Debug logging
  React.useEffect(() => {
    console.log('LinkToFieldModal - ETB Data:', {
      etbData,
      rowCount: etbData?.rows?.length || 0,
      etbLoading,
      etbError,
      firstFewRows: etbData?.rows?.slice(0, 3)
    });
  }, [etbData, etbLoading, etbError]);

  const handleLink = async () => {
    console.log('🔗 LinkToFieldModal: handleLink called with:', {
      selectedRowId,
      workbookId: workbook?.id,
      workbookName: workbook?.name,
      etbDataRows: etbData?.rows?.length || 0,
      selection
    });

    if (!selectedRowId || !workbook) {
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
      // Find the selected row by code (selectedRowId is the code)
      const selectedRow = etbData.rows.find(row => row.code === selectedRowId);
      
      console.log('🔗 LinkToFieldModal: Looking for row:', {
        searchingFor: selectedRowId,
        foundRow: selectedRow ? {
          code: selectedRow.code,
          name: selectedRow.accountName,
          classification: selectedRow.classification
        } : null
      });

      if (!selectedRow) {
        toast({
          title: "Error",
          description: `Selected row not found. Row code: ${selectedRowId}`,
          variant: "destructive",
        });
        return;
      }

      // Create mapping details - destinationField should be the row code
      const mappingDetails = {
        sheet: selection?.sheet || "",
        start: selection?.start || { row: 0, col: 0 },
        end: selection?.end || { row: 0, col: 0 },
        destinationField: selectedRow.code, // Use code as destinationField
        transform: transform,
        color: "bg-blue-200",
      };

      console.log('🔗 LinkToFieldModal: Creating mapping:', mappingDetails);
      console.log('🔗 LinkToFieldModal: Calling onLink callback (WorkBookApp.handleCreateMapping)...');

      // Call the onLink callback
      onLink(workbook.id, mappingDetails);
      
      toast({
        title: "Success",
        description: rowType === 'evidence'
          ? `Workbook "${workbook.name}" linked to file "${selectedRow.accountName}" successfully`
          : `Workbook "${workbook.name}" linked to field "${selectedRow.code} - ${selectedRow.accountName}" successfully`,
      });
      
      onClose();
    } catch (error) {
      console.error(`Error linking workbook to ${rowType === 'evidence' ? 'file' : 'field'}:`, error);
      toast({
        title: "Error",
        description: rowType === 'evidence' 
          ? "Failed to link workbook to file"
          : "Failed to link workbook to field",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  // --- MODIFIED SELECTION TEXT CALCULATION ---
  const getSelectionRangeText = () => {
    if (!selection) return "None";
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

  const selectionText = getSelectionRangeText();
  // --- END MODIFIED SELECTION TEXT CALCULATION ---

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rowType === 'evidence' ? 'Link Workbook to File' : 'Link Workbook to Field'}
          </DialogTitle>
          <DialogDescription>
            Select {rowType === 'evidence' ? 'a file' : 'a field'} to link the workbook "{workbook?.name}" to.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Selection
              </Label>
              <div className="mt-1">
                <Badge variant="outline">{selectionText}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-select">
                {rowType === 'evidence' ? 'File' : 'Field'}
              </Label>
              {etbLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading {rowType === 'evidence' ? 'file' : 'field'} data...
                </div>
              ) : etbError ? (
                <div className="text-sm text-red-500 p-2 border border-red-200 rounded-md">
                  Error: {etbError}
                </div>
              ) : !etbData || etbData.rows.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2 border rounded-md">
                  No {rowType === 'evidence' ? 'file' : 'field'} data available. Please ensure {rowType === 'evidence' ? 'evidence files are uploaded' : 'the Extended Trial Balance is populated'}.
                </div>
              ) : (
                <Select
                  value={selectedRowId}
                  onValueChange={setSelectedRowId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={rowType === 'evidence' ? 'Select a file' : 'Select a field'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {etbData.rows.map((row) => (
                      <SelectItem 
                        key={row.code} 
                        value={row.code}
                        className="cursor-pointer"
                      >
                        {rowType === 'evidence' ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{row.accountName}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">{row.code} - {row.accountName}</span>
                            {row.classification && (
                              <span className="text-xs text-muted-foreground">{row.classification}</span>
                            )}
                          </div>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {etbData && etbData.rows.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {etbData.rows.length} {rowType === 'evidence' ? 'file' : 'field'}{etbData.rows.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transform">Transform</Label>
              <Select value={transform} onValueChange={setTransform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a transform" />
                </SelectTrigger>
                <SelectContent>
                  {transforms.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="validation">Validation (Optional)</Label>
              <Select value={validationType} onValueChange={setValidationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a validation rule" />
                </SelectTrigger>
                <SelectContent>
                  {validations.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {validationType === "numeric_range" && (
                <div className="flex space-x-2 pt-2">
                  <Input
                    type="number"
                    placeholder="Min (e.g., 0)"
                    value={validationParams.min}
                    onChange={(e) =>
                      setValidationParams((prev) => ({
                        ...prev,
                        min: e.target.value,
                      }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max (e.g., 1000000)"
                    value={validationParams.max}
                    onChange={(e) =>
                      setValidationParams((prev) => ({
                        ...prev,
                        max: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {validationType === "regex" && (
                <div className="pt-2">
                  <Input
                    placeholder="Regex pattern"
                    value={validationParams.pattern}
                    onChange={(e) =>
                      setValidationParams((prev) => ({
                        ...prev,
                        pattern: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setSelectedRowId("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedRowId || isLinking}
          >
            {isLinking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Linking...
              </>
            ) : (
              "Link Workbook"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};