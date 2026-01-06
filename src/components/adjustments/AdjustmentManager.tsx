// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Save, FileText, Check, X, Edit2, ArrowLeftRight, History, Download, Paperclip, ExternalLink, Eye, Image, FileSpreadsheet, File } from "lucide-react";
import { toast } from "sonner";
import { useAdjustment } from "@/hooks/useAdjustment";
import { AdjustmentHistory } from "./AdjustmentHistory";
import { adjustmentApi, engagementApi } from "@/services/api";
import { Label } from "@/components/ui/label";

interface ETBRow {
  _id?: string;
  id?: string;
  code: string;
  accountName: string;
  currentYear: number;
  priorYear: number;
  adjustments: number;
  finalBalance: number;
  classification: string;
}

interface AdjustmentEntry {
  id: string;
  etbRowId: string;
  code: string;
  accountName: string;
  dr: number;
  cr: number;
  details: string;
}

interface AdjustmentManagerProps {
  engagement: any;
  etbRows: ETBRow[];
  etbId: string;
  isReadOnly?: boolean;
}

// Helper to safely get row identifier - use _id, id, or code as fallback
const getRowId = (row: ETBRow | null | undefined): string => {
  if (!row) return "";
  return row._id || row.id || row.code || "";
};

export const AdjustmentManager: React.FC<AdjustmentManagerProps> = ({
  engagement,
  etbRows,
  etbId,
  isReadOnly = false,
}) => {
  // Debug: Log ETB rows to see their structure
  useEffect(() => {
    console.log("=== ETB Rows Debug ===");
    console.log("Total rows:", etbRows.length);
    console.log("ETB ID:", etbId);
    if (etbRows.length > 0) {
      console.log("First row full structure:", JSON.stringify(etbRows[0], null, 2));
      console.log("First row keys:", Object.keys(etbRows[0]));
      console.log("First row _id:", etbRows[0]._id);
      console.log("First row id:", etbRows[0].id);
      console.log("First row code:", etbRows[0].code);
      console.log("First row computed ID:", getRowId(etbRows[0]));
      
      // Check all rows
      const rowsWithoutId = etbRows.filter(r => !getRowId(r));
      console.log("Rows without any ID:", rowsWithoutId.length);
      if (rowsWithoutId.length > 0) {
        console.log("Example row without ID:", rowsWithoutId[0]);
      }
      
      // Show what field we're using as identifier
      const usingField = etbRows[0]._id ? "_id" : etbRows[0].id ? "id" : etbRows[0].code ? "code" : "NONE";
      console.log(`Using "${usingField}" as row identifier`);
    }
  }, [etbRows, etbId]);

  // State
  const [isCreating, setIsCreating] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null);
  const [currentAdjustmentNo, setCurrentAdjustmentNo] = useState("");
  const [currentDescription, setCurrentDescription] = useState("");
  const [entries, setEntries] = useState<AdjustmentEntry[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [selectedAdjustmentForHistory, setSelectedAdjustmentForHistory] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [selectedAdjustmentForEvidence, setSelectedAdjustmentForEvidence] = useState<any>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Use the adjustment hook
  const {
    adjustments,
    loading,
    isCreating: isSaving,
    isUpdating,
    isPosting,
    history,
    isFetchingHistory,
    fetchHistory,
    createAdjustment,
    updateAdjustment,
    postAdjustment,
    deleteAdjustment,
    refetch,
  } = useAdjustment({ engagementId: engagement._id });

  // Auto-refetch when component mounts and after operations
  useEffect(() => {
    refetch();
  }, []);

  // Sync selected adjustment for evidence dialog when adjustments list changes
  useEffect(() => {
    if (selectedAdjustmentForEvidence && adjustments.length > 0) {
      const updated = adjustments.find(a => a._id === selectedAdjustmentForEvidence._id);
      if (updated) {
        // Only update if the evidence files are different to avoid unnecessary re-renders
        const currentFiles = selectedAdjustmentForEvidence.evidenceFiles || [];
        const updatedFiles = updated.evidenceFiles || [];
        if (currentFiles.length !== updatedFiles.length || 
            JSON.stringify(currentFiles.map((f: any) => f._id)) !== JSON.stringify(updatedFiles.map((f: any) => f._id))) {
          setSelectedAdjustmentForEvidence(updated);
        }
      }
    }
  }, [adjustments, selectedAdjustmentForEvidence?._id]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalDr = entries.reduce((sum, entry) => sum + (entry.dr || 0), 0);
    const totalCr = entries.reduce((sum, entry) => sum + (entry.cr || 0), 0);
    const balance = totalDr - totalCr;
    return { totalDr, totalCr, balance };
  }, [entries]);

  // Check if adjustment is balanced
  const isBalanced = totals.balance === 0 && entries.length > 0;

  // Start creating new adjustment
  const handleStartCreating = () => {
    const nextNum = adjustments.length + 1;
    setCurrentAdjustmentNo(`AA${nextNum}`);
    setCurrentDescription("");
    setEntries([]);
    setEditingAdjustmentId(null);
    setIsCreating(true);
  };

  // Load draft for editing
  const handleEditDraft = (adjustment: any) => {
    if (adjustment.status === "posted") {
      toast.warning("⚠️ Warning: Editing a POSTED adjustment. Changes will affect ETB data.");
    }
    
    setEditingAdjustmentId(adjustment._id);
    setCurrentAdjustmentNo(adjustment.adjustmentNo);
    setCurrentDescription(adjustment.description || "");
    setEntries(
      adjustment.entries.map((e: any, idx: number) => ({
        id: `entry_${idx}_${Date.now()}`,
        etbRowId: e.etbRowId,
        code: e.code,
        accountName: e.accountName,
        dr: e.dr || 0,
        cr: e.cr || 0,
        details: e.details || "",
      }))
    );
    setIsCreating(true);
  };

  // Cancel adjustment creation/editing
  const handleCancel = () => {
    setIsCreating(false);
    setEditingAdjustmentId(null);
    setCurrentAdjustmentNo("");
    setCurrentDescription("");
    setEntries([]);
  };

  // Add entry from account selector
  const handleAddEntry = (row: ETBRow, type: "DR" | "CR", amount: number) => {
    // Get row identifier using helper
    const rowId = getRowId(row);
    
    console.log("=== Adding Entry ===");
    console.log("Selected row:", row);
    console.log("Computed rowId:", rowId);
    console.log("Type:", type);
    console.log("Amount:", amount);
    
    if (!rowId) {
      toast.error("Invalid row: missing identifier. Check console for row structure.");
      console.error("Row has no _id, id, or code:", row);
      return;
    }

    const newEntry: AdjustmentEntry = {
      id: `entry_${Date.now()}_${Math.random()}`,
      etbRowId: rowId,
      code: row.code,
      accountName: row.accountName,
      dr: type === "DR" ? amount : 0,
      cr: type === "CR" ? amount : 0,
      details: "",
    };

    setEntries((prev) => [...prev, newEntry]);
    setShowAccountSelector(false);
  };

  // Remove entry
  const handleRemoveEntry = (entryId: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  // Update entry amount
  const handleUpdateAmount = (entryId: string, type: "DR" | "CR", value: string) => {
    // Parse the value properly, handling empty string and converting to number
    let numValue = 0;
    if (value === "" || value === null || value === undefined) {
      numValue = 0;
    } else {
      // Remove leading zeros and parse
      const cleaned = value.replace(/^0+(?=\d)/, ''); // Remove leading zeros but keep single 0
      numValue = parseFloat(cleaned) || 0;
    }
    
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              dr: type === "DR" ? numValue : 0,
              cr: type === "CR" ? numValue : 0,
            }
          : e
      )
    );
  };

  // Switch DR/CR for an entry
  const handleSwitchType = (entryId: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        // Switch the amounts
        return {
          ...e,
          dr: e.cr,
          cr: e.dr,
        };
      })
    );
  };

  // Update entry details
  const handleUpdateDetails = (entryId: string, details: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, details } : e))
    );
  };

  // Save as draft (create or update)
  const handleSaveDraft = async () => {
    if (!currentAdjustmentNo) {
      toast.error("Please enter an adjustment number");
      return;
    }

    if (entries.length === 0) {
      toast.error("Please add at least one entry");
      return;
    }

    try {
      const adjustmentData = {
        engagementId: engagement._id,
        etbId: etbId,
        adjustmentNo: currentAdjustmentNo,
        description: currentDescription,
        entries: entries.map((e) => ({
          etbRowId: e.etbRowId,
          code: e.code,
          accountName: e.accountName,
          dr: e.dr || 0,
          cr: e.cr || 0,
          details: e.details || "",
        })),
      };

      if (editingAdjustmentId) {
        // Update existing draft
        await updateAdjustment(editingAdjustmentId, adjustmentData);
        toast.success("Adjustment updated successfully");
      } else {
        // Create new draft
        await createAdjustment(adjustmentData);
        toast.success("Adjustment saved as draft");
      }

      handleCancel();
      // Explicitly refetch to update the list
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save adjustment");
    }
  };

  // Post adjustment (create new and post immediately)
  const handlePost = async () => {
    if (!isBalanced) {
      toast.error("Adjustment is not balanced. DR must equal CR.");
      return;
    }

    if (!currentAdjustmentNo) {
      toast.error("Please enter an adjustment number");
      return;
    }

    try {
      if (editingAdjustmentId) {
        // Update and then post
        await updateAdjustment(editingAdjustmentId, {
          description: currentDescription,
          entries: entries.map((e) => ({
            etbRowId: e.etbRowId,
            code: e.code,
            accountName: e.accountName,
            dr: e.dr || 0,
            cr: e.cr || 0,
            details: e.details || "",
          })),
        });
        await postAdjustment(editingAdjustmentId);
      } else {
        // Create and post
        const created = await createAdjustment({
          engagementId: engagement._id,
          etbId: etbId,
          adjustmentNo: currentAdjustmentNo,
          description: currentDescription,
          entries: entries.map((e) => ({
            etbRowId: e.etbRowId,
            code: e.code,
            accountName: e.accountName,
            dr: e.dr || 0,
            cr: e.cr || 0,
            details: e.details || "",
          })),
        });
        await postAdjustment(created._id);
      }

      toast.success("Adjustment posted successfully");
      handleCancel();
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to post adjustment");
    }
  };

  // Post existing draft
  const handlePostDraft = async (adjustmentId: string) => {
    try {
      await postAdjustment(adjustmentId);
      toast.success("Adjustment posted successfully");
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to post adjustment");
    }
  };

  // Delete adjustment
  const handleDelete = async (adjustmentId: string) => {
    const adj = adjustments.find(a => a._id === adjustmentId);
    
    let confirmMessage = "Are you sure you want to delete this adjustment?";
    if (adj?.status === "posted") {
      confirmMessage = "Delete this POSTED adjustment?\n\n" +
                       "This will:\n" +
                       "• Reverse its impact on the ETB\n" +
                       "• Remove all affected adjustment values from accounts\n" +
                       "• Permanently delete the adjustment record\n\n" +
                       "Are you sure?";
    }
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await deleteAdjustment(adjustmentId);
      
      if (response?.wasPosted) {
        toast.success("Adjustment deleted and ETB impact reversed");
      } else {
        toast.success("Adjustment deleted");
      }
      
      await refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete adjustment");
    }
  };

  // View adjustment history
  const handleViewHistory = async (adjustment: any) => {
    try {
      setSelectedAdjustmentForHistory(adjustment);
      await fetchHistory(adjustment._id);
      setIsViewingHistory(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load adjustment history");
    }
  };

  // Back from history view
  const handleBackFromHistory = () => {
    setIsViewingHistory(false);
    setSelectedAdjustmentForHistory(null);
  };

  // Export adjustments to Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await adjustmentApi.export(engagement._id);
      toast.success("Adjustments exported successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to export adjustments");
    } finally {
      setIsExporting(false);
    }
  };

  // Open evidence dialog
  const handleOpenEvidenceDialog = (adjustment: any) => {
    setSelectedAdjustmentForEvidence(adjustment);
    setShowEvidenceDialog(true);
  };

  // Upload evidence file
  const handleUploadEvidence = async (file: File) => {
    if (!selectedAdjustmentForEvidence) return;

    setUploadingEvidence(true);
    try {
      // Upload file to engagement library
      const uploadResult = await engagementApi.uploadToLibrary(
        engagement._id,
        file,
        "Adjustments"
      );

      // Extract file URL and name
      const fileUrl = uploadResult.url || uploadResult.data?.url;
      const fileName = file.name;

      if (!fileUrl) {
        throw new Error("Failed to get file URL after upload");
      }

      // Link evidence file to adjustment
      await adjustmentApi.addEvidenceFile(
        selectedAdjustmentForEvidence._id,
        fileName,
        fileUrl
      );

      toast.success("Evidence file uploaded and linked successfully");
      
      // Refresh adjustments list
      await refetch();
      
      // Update selected adjustment
      const updated = adjustments.find(a => a._id === selectedAdjustmentForEvidence._id);
      if (updated) {
        setSelectedAdjustmentForEvidence(updated);
      }
      
      // Close the dialog after successful upload
      setShowEvidenceDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload evidence file");
    } finally {
      setUploadingEvidence(false);
    }
  };

  // Remove evidence file
  const handleRemoveEvidence = async (evidenceId: string) => {
    if (!selectedAdjustmentForEvidence) return;

    if (!confirm("Are you sure you want to remove this evidence file?")) {
      return;
    }

    const adjustmentId = selectedAdjustmentForEvidence._id;

    try {
      // Optimistically update the UI immediately
      setSelectedAdjustmentForEvidence((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          evidenceFiles: (prev.evidenceFiles || []).filter(
            (file: any) => file._id?.toString() !== evidenceId
          ),
        };
      });

      await adjustmentApi.removeEvidenceFile(adjustmentId, evidenceId);

      toast.success("Evidence file removed successfully");
      
      // Refresh adjustments list
      await refetch();
      
      // Fetch the specific adjustment by ID to get the latest data
      try {
        const response = await adjustmentApi.getById(adjustmentId);
        if (response?.data) {
          setSelectedAdjustmentForEvidence(response.data);
        }
      } catch (fetchError) {
        // If fetching by ID fails, try to find from adjustments array
        const updated = adjustments.find(a => a._id === adjustmentId);
        if (updated) {
          setSelectedAdjustmentForEvidence(updated);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to remove evidence file");
      
      // Revert optimistic update on error by fetching latest data
      try {
        const response = await adjustmentApi.getById(adjustmentId);
        if (response?.data) {
          setSelectedAdjustmentForEvidence(response.data);
        }
      } catch (fetchError) {
        // If fetching by ID fails, try to find from adjustments array
        await refetch();
        const updated = adjustments.find(a => a._id === adjustmentId);
        if (updated) {
          setSelectedAdjustmentForEvidence(updated);
        }
      }
    }
  };

  // Helper functions for file preview
  const getFileIcon = (fileName: string) => {
    const type = fileName.toLowerCase();
    if (type.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) return <Image className="h-5 w-5 text-green-500" />;
    if (type.match(/\.(pdf)$/i)) return <FileText className="h-5 w-5 text-red-500" />;
    if (type.match(/\.(doc|docx)$/i)) return <FileText className="h-5 w-5 text-blue-500" />;
    if (type.match(/\.(xls|xlsx)$/i)) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString();
  };

  const renderFilePreview = (file: any) => {
    const fileName = file.fileName || '';
    const fileUrl = file.fileUrl || '';
    const type = fileName.toLowerCase();

    // Images
    if (type.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
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

    // PDFs
    if (type.match(/\.(pdf)$/i)) {
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

    // Office documents
    if (type.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)) {
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

    // Text files
    if (type.match(/\.(txt|csv)$/i)) {
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

    // Default: Show file info
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center p-8">
          <div className="mb-4">
            {getFileIcon(fileName)}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{fileName}</h3>
          <p className="text-sm text-gray-600 mb-4">
            Preview not available for this file type
          </p>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-xs text-gray-400">
              File uploaded on {formatDate(file.uploadedAt)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.open(fileUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Open file preview
  const handleOpenPreview = (file: any) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  // Account Selector Dialog
  const AccountSelectorDialog = () => {
    const [tempAmount, setTempAmount] = useState("");
    const [tempType, setTempType] = useState<"DR" | "CR">("DR");
    const [selectedRow, setSelectedRow] = useState<ETBRow | null>(null);
    const [localSearchTerm, setLocalSearchTerm] = useState("");

    // Local filtered rows - doesn't cause parent re-render
    const filteredRows = useMemo(() => {
      if (!localSearchTerm) return etbRows;
      const term = localSearchTerm.toLowerCase();
      return etbRows.filter(
        (row) =>
          row.code.toLowerCase().includes(term) ||
          row.accountName.toLowerCase().includes(term)
      );
    }, [localSearchTerm]);

    return (
      <Dialog open={showAccountSelector} onOpenChange={setShowAccountSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Account</DialogTitle>
            <DialogDescription>
              Choose an account to add to the adjustment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <Input
              placeholder="Search by code or account name..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
            />

            {/* Account List */}
            <ScrollArea className="h-[40vh]">
              <div className="space-y-2">
                {filteredRows.map((row) => {
                  const rowId = getRowId(row);
                  const selectedRowId = getRowId(selectedRow);
                  
                  return (
                  <div
                    key={rowId || `row_${Math.random()}`}
                    onClick={() => setSelectedRow(row)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      rowId && selectedRowId && rowId === selectedRowId
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono text-sm font-semibold">
                          {row.code}
                        </span>
                        <span className="ml-2">{row.accountName}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {row.currentYear.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Entry Details */}
            {selectedRow && (
              <div className="border-t pt-4 space-y-3">
                <div className="font-medium">Selected Account:</div>
                <div className="text-sm text-gray-600">
                  {selectedRow.code} - {selectedRow.accountName}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select value={tempType} onValueChange={(v) => setTempType(v as "DR" | "CR")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DR">Debit (DR)</SelectItem>
                        <SelectItem value="CR">Credit (CR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Amount</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={tempAmount}
                      onChange={(e) => setTempAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountSelector(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedRow) {
                  toast.error("Please select an account");
                  return;
                }
                if (!tempAmount || parseFloat(tempAmount) <= 0) {
                  toast.error("Please enter a valid amount");
                  return;
                }
                handleAddEntry(selectedRow, tempType, parseFloat(tempAmount));
                setTempAmount("");
                setSelectedRow(null);
              }}
              disabled={!selectedRow || !tempAmount}
            >
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Adjustments</h2>
          <p className="text-gray-500">Manage audit adjustments for this engagement</p>
        </div>
        {!isReadOnly && !isCreating && !isViewingHistory && (
          <div className="flex items-center gap-2">
            {adjustments.length > 0 && (
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export to Excel
              </Button>
            )}
            <Button onClick={handleStartCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Create Adjustment
            </Button>
          </div>
        )}
      </div>

      {/* History View */}
      {isViewingHistory && (
        <AdjustmentHistory
          history={history}
          adjustmentNo={selectedAdjustmentForHistory?.adjustmentNo || ""}
          loading={isFetchingHistory}
          onBack={handleBackFromHistory}
        />
      )}

      {/* Create/Edit Adjustment Form */}
      {isCreating && !isViewingHistory && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAdjustmentId ? "Edit Adjustment" : "New Adjustment"}
            </CardTitle>
            <CardDescription>
              {editingAdjustmentId
                ? "Edit the adjustment. Changes will be saved to the draft."
                : "Create a new adjustment entry. Balance must be zero (DR = CR) before posting."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warning for editing posted adjustments */}
            {editingAdjustmentId && adjustments.find(a => a._id === editingAdjustmentId)?.status === "posted" && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
                <div className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  ⚠️
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900 mb-1">
                    Editing Posted Adjustment (Temporary Feature)
                  </h4>
                  <p className="text-sm text-amber-700">
                    This adjustment has already been posted to the ETB. Changes here will NOT automatically update the ETB.
                    To apply changes, you need to delete and recreate the adjustment.
                    This edit capability is temporary and will be removed in future versions.
                  </p>
                </div>
              </div>
            )}
            
            {/* Adjustment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Adjustment No.</label>
                <Input
                  value={currentAdjustmentNo}
                  onChange={(e) => setCurrentAdjustmentNo(e.target.value)}
                  placeholder="e.g., AA1"
                  disabled={!!editingAdjustmentId}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={currentDescription}
                  onChange={(e) => setCurrentDescription(e.target.value)}
                  placeholder="Brief description of adjustment"
                />
              </div>
            </div>

            {/* Entries Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Entries</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAccountSelector(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Entry
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left border-r">Code</th>
                      <th className="px-4 py-2 text-left border-r">Account Name</th>
                      <th className="px-4 py-2 text-center border-r">Type</th>
                      <th className="px-4 py-2 text-right border-r">Amount</th>
                      <th className="px-4 py-2 text-left border-r">Details</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No entries added yet. Click "Add Entry" to start.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => {
                        const currentType = entry.dr > 0 ? "DR" : "CR";
                        const currentAmount = entry.dr > 0 ? entry.dr : entry.cr;
                        
                        return (
                          <tr key={entry.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2 border-r font-mono text-xs">
                              {entry.code}
                            </td>
                            <td className="px-4 py-2 border-r">{entry.accountName}</td>
                            <td className="px-4 py-2 border-r text-center">
                              <Select
                                value={currentType}
                                onValueChange={(type) => {
                                  if (type !== currentType) {
                                    handleSwitchType(entry.id);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 w-16">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DR">DR</SelectItem>
                                  <SelectItem value="CR">CR</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2 border-r">
                              <Input
                                type="number"
                                value={currentAmount || ""}
                                onChange={(e) =>
                                  handleUpdateAmount(entry.id, currentType, e.target.value)
                                }
                                onBlur={(e) => {
                                  // Clean up the value on blur to remove leading zeros
                                  const cleaned = parseFloat(e.target.value) || 0;
                                  handleUpdateAmount(entry.id, currentType, cleaned.toString());
                                }}
                                className="h-7 text-xs text-right"
                                step="any"
                              />
                            </td>
                            <td className="px-4 py-2 border-r">
                              <Input
                                value={entry.details}
                                onChange={(e) =>
                                  handleUpdateDetails(entry.id, e.target.value)
                                }
                                placeholder="Optional details..."
                                className="h-7 text-xs"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveEntry(entry.id)}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* Totals Row */}
                    {entries.length > 0 && (
                      <tr className="border-t-2 bg-gray-100 font-semibold">
                        <td colSpan={2} className="px-4 py-2 border-r">
                          TOTALS
                        </td>
                        <td className="px-4 py-2 border-r text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs">DR: {totals.totalDr.toLocaleString()}</span>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-xs">CR: {totals.totalCr.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r text-right">
                          <Badge
                            variant={isBalanced ? "default" : "destructive"}
                            className="font-mono"
                          >
                            {isBalanced ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <X className="h-3 w-3 mr-1" />
                            )}
                            Balance: {totals.balance.toLocaleString()}
                          </Badge>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!isBalanced && entries.length > 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Adjustment must be balanced before posting (DR = CR)
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={(isSaving || isUpdating) || entries.length === 0}
              >
                {(isSaving || isUpdating) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {editingAdjustmentId ? "Update Draft" : "Save as Draft"}
              </Button>
              <Button
                onClick={handlePost}
                disabled={!isBalanced || isPosting || entries.length === 0}
              >
                {isPosting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Post Adjustment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Adjustments List */}
      {!isViewingHistory && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Existing Adjustments</h3>
          {adjustments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No adjustments created yet</p>
              <p className="text-sm">Click "Create Adjustment" to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {adjustments.map((adj) => (
              <Card key={adj._id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="font-mono">
                          {adj.adjustmentNo}
                        </Badge>
                        <Badge
                          variant={adj.status === "posted" ? "default" : "secondary"}
                        >
                          {adj.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {adj.description || "No description"}
                      </p>

                      {/* Entries Summary */}
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-1 text-left">Code</th>
                              <th className="px-3 py-1 text-left">Account</th>
                              <th className="px-3 py-1 text-right">DR</th>
                              <th className="px-3 py-1 text-right">CR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {adj.entries.map((entry, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="px-3 py-1 font-mono">{entry.code}</td>
                                <td className="px-3 py-1">{entry.accountName}</td>
                                <td className="px-3 py-1 text-right">
                                  {entry.dr > 0 ? entry.dr.toLocaleString() : "-"}
                                </td>
                                <td className="px-3 py-1 text-right">
                                  {entry.cr > 0 ? entry.cr.toLocaleString() : "-"}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t bg-gray-50 font-semibold">
                              <td colSpan={2} className="px-3 py-1">
                                Total
                              </td>
                              <td className="px-3 py-1 text-right">
                                {adj.totalDr.toLocaleString()}
                              </td>
                              <td className="px-3 py-1 text-right">
                                {adj.totalCr.toLocaleString()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Evidence Files Section */}
                      {!isReadOnly && 
                        <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Attached Files</span>
                            <Badge variant="outline" className="text-xs">
                              {adj.evidenceFiles?.length || 0}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEvidenceDialog(adj)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                        </div>
                        {adj.evidenceFiles && adj.evidenceFiles.length > 0 && (
                          <div className="space-y-1">
                            {adj.evidenceFiles.slice(0, 3).map((file: any) => (
                              <div
                                key={file._id || file.fileName}
                                className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                              >
                                <span className="truncate flex-1">{file.fileName}</span>
                                <div className="flex items-center gap-1 ml-2">
                                  <button
                                    onClick={() => handleOpenPreview(file)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Preview"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </button>
                                  <a
                                    href={file.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Open in new tab"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            ))}
                            {adj.evidenceFiles.length > 3 && (
                              <p className="text-xs text-gray-500">
                                +{adj.evidenceFiles.length - 3} more file(s)
                              </p>
                            )}
                          </div>
                        )}
                        {(!adj.evidenceFiles || adj.evidenceFiles.length === 0) && (
                          <p className="text-xs text-gray-400">No evidence files linked</p>
                        )}
                      </div>}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {/* History Button */}
                      {!isReadOnly && 
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewHistory(adj)}
                      >
                        <History className="h-3 w-3 mr-1" />
                        History
                      </Button>
                         }
                      {!isReadOnly && (
                        <>
                          {/* TEMPORARY: Allow editing posted adjustments */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditDraft(adj)}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          
                          {adj.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => handlePostDraft(adj._id)}
                              disabled={isPosting}
                            >
                              {isPosting ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 mr-1" />
                              )}
                              Post
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(adj._id)}
                            title={adj.status === "posted" ? "Delete and reverse ETB impact" : "Delete adjustment"}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {adj.status === "posted" ? "Delete & Reverse" : "Delete"}
                          </Button>
                        </>
                      )}
                      
                      {adj.status === "posted" && (
                        <Badge variant="default" className="whitespace-nowrap mt-2">
                          <Check className="h-3 w-3 mr-1" />
                          Posted
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Account Selector Dialog */}
      <AccountSelectorDialog />

      {/* Evidence Files Dialog */}
      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Attached Files</DialogTitle>
            <DialogDescription>
              Upload and manage evidence files for {selectedAdjustmentForEvidence?.adjustmentNo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload Section */}
            {!isReadOnly && (
              <div>
                <Label htmlFor="evidence-upload">Upload Evidence File</Label>
                <Input
                  id="evidence-upload"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadEvidence(file);
                      e.target.value = ""; // Reset input
                    }
                  }}
                  disabled={uploadingEvidence}
                  className="mt-1"
                />
                {uploadingEvidence && (
                  <p className="text-xs text-gray-500 mt-1">
                    <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                    Uploading...
                  </p>
                )}
              </div>
            )}

            {/* Existing Files */}
            <div>
              <Label>Linked Attached Files</Label>
              {selectedAdjustmentForEvidence?.evidenceFiles &&
              selectedAdjustmentForEvidence.evidenceFiles.length > 0 ? (
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {selectedAdjustmentForEvidence.evidenceFiles.map((file: any) => (
                    <div
                      key={file._id || file.fileName}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded by {file.uploadedBy?.userName || "Unknown"} •{" "}
                          {file.uploadedAt
                            ? new Date(file.uploadedAt).toLocaleDateString()
                            : "Unknown date"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenPreview(file)}
                          title="Preview file"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(file.fileUrl, "_blank")}
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {!isReadOnly && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveEvidence(file._id)}
                            title="Remove file"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2">No evidence files linked</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvidenceDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {previewFile && getFileIcon(previewFile.fileName)}
                <span className="truncate max-w-md">{previewFile?.fileName}</span>
              </div>
              <div className="text-sm text-gray-500 font-normal">
                Uploaded by: <span className="font-medium text-gray-700">
                  {previewFile?.uploadedBy?.userName || "Unknown"}
                </span>
                {previewFile?.uploadedAt && (
                  <span className="ml-2">
                    • {formatDate(previewFile.uploadedAt)}
                  </span>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col h-[75vh]">
            {/* File Preview */}
            <div className="flex-1 border rounded-lg overflow-hidden mb-4 bg-gray-50">
              {previewFile && renderFilePreview(previewFile)}
            </div>

            {/* File Actions */}
            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => previewFile && window.open(previewFile.fileUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
