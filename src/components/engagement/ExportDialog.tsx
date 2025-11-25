import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileSpreadsheet, FolderOpen, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement: any;
}

// Helper function to get auth token
async function getAuthToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.access_token;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  engagement,
}) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const { toast } = useToast();

  const baseUrl = import.meta.env.VITE_APIURL;

  const handleExport = async (type: "etb" | "adjustments" | "reclassifications" | "evidence", format: "xlsx" | "pdf" = "xlsx") => {
    if (!engagement?._id) {
      toast({
        title: "Error",
        description: "Engagement ID is required",
        variant: "destructive",
      });
      return;
    }

    setExporting(type);

    try {
      const token = await getAuthToken();
      let url = "";
      
      if (type === "evidence") {
        url = `${baseUrl}/api/engagements/${engagement._id}/export/evidence`;
      } else {
        url = `${baseUrl}/api/engagements/${engagement._id}/export/${type}?format=${format}`;
      }

      setExporting(`${type}_${format}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to export ${type}`
        );
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      if (!filename) {
        const engagementName = engagement.name || `Engagement_${engagement._id}`;
        const sanitized = engagementName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const typeNames = {
          etb: "Extended_Trial_Balance",
          adjustments: "Adjustments",
          reclassifications: "Reclassifications",
          evidence: "EvidenceFiles",
        };
        const extension = type === "evidence" ? "zip" : format;
        filename = `${sanitized}_${typeNames[type]}.${extension}`;
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Success",
        description: `${type === "evidence" ? "Evidence files" : type.charAt(0).toUpperCase() + type.slice(1)} exported successfully as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      console.error(`Error exporting ${type}:`, error);
      toast({
        title: "Export Failed",
        description: error.message || `Failed to export ${type}`,
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Export Extended Trial Balance, Adjustments, Reclassifications, and Evidence Files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Extended Trial Balance */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Extended Trial Balance</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Export Extended Trial Balance with all columns including Grouping1-4 and Linked Files
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExport("etb", "xlsx")}
                    disabled={exporting !== null}
                    className="flex-1"
                    size="sm"
                  >
                    {exporting === "etb_xlsx" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleExport("etb", "pdf")}
                    disabled={exporting !== null}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                  >
                    {exporting === "etb_pdf" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Export Adjustments */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Adjustments</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Export all adjustments with evidence file links
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExport("adjustments", "xlsx")}
                    disabled={exporting !== null}
                    className="flex-1"
                    size="sm"
                  >
                    {exporting === "adjustments_xlsx" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleExport("adjustments", "pdf")}
                    disabled={exporting !== null}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                  >
                    {exporting === "adjustments_pdf" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Export Reclassifications */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Reclassifications</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Export all reclassifications with evidence file links
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExport("reclassifications", "xlsx")}
                    disabled={exporting !== null}
                    className="flex-1"
                    size="sm"
                  >
                    {exporting === "reclassifications_xlsx" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleExport("reclassifications", "pdf")}
                    disabled={exporting !== null}
                    className="flex-1"
                    size="sm"
                    variant="outline"
                  >
                    {exporting === "reclassifications_pdf" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Export Evidence Files (ZIP) */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FolderOpen className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Linked Evidence Files</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Export all evidence files linked to Adjustments and Reclassifications as a ZIP archive
                </p>
                <Button
                  onClick={() => handleExport("evidence")}
                  disabled={exporting !== null}
                  className="w-full"
                  size="sm"
                  variant="outline"
                >
                  {exporting === "evidence" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Evidence Files
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

