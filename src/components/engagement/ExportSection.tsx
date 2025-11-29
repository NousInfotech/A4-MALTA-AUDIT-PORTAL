import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileSpreadsheet, FolderOpen, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";

interface ExportSectionProps {
  engagement: any;
  onClose?: () => void;
}

// Helper function to get auth token
async function getAuthToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.access_token;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  engagement,
  onClose,
}) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const { toast } = useToast();

  const baseUrl = import.meta.env.VITE_APIURL;

  const handleExport = async (type: "etb" | "adjustments" | "reclassifications" | "evidence" | "all-evidence" | "all-workbooks" | "combined", format: "xlsx" | "pdf" = "xlsx") => {
    if (!engagement?._id) {
      toast({
        title: "Error",
        description: "Engagement ID is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = await getAuthToken();
      let url = "";
      
      if (type === "evidence") {
        setExporting("evidence");
        url = `${baseUrl}/api/engagements/${engagement._id}/export/evidence`;
      } else if (type === "all-evidence") {
        setExporting("all-evidence");
        url = `${baseUrl}/api/engagements/${engagement._id}/export/all-evidence`;
      } else if (type === "all-workbooks") {
        setExporting("all-workbooks");
        url = `${baseUrl}/api/engagements/${engagement._id}/export/all-workbooks`;
      } else if (type === "combined") {
        setExporting(format === "pdf" ? "combined_pdf" : "combined");
        url = `${baseUrl}/api/engagements/${engagement._id}/export/combined${format === "pdf" ? "?format=pdf" : ""}`;
      } else {
        setExporting(`${type}_${format}`);
        url = `${baseUrl}/api/engagements/${engagement._id}/export/${type}?format=${format}`;
      }

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
          "all-evidence": "AllEvidenceFiles",
          "all-workbooks": "AllWorkbooks",
          combined: "",
        };
        const extension = (type === "evidence" || type === "all-evidence" || type === "all-workbooks") ? "zip" : type === "combined" && format === "pdf" ? "pdf.zip" : type === "combined" ? "xlsx" : format;
        filename = type === "combined" && format === "pdf" 
          ? `${sanitized}_Combined_Reports.pdf.zip`
          : type === "combined" 
            ? `${sanitized}.xlsx` 
            : `${sanitized}_${typeNames[type]}.${extension}`;
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
        description: type === "combined" && format === "pdf"
          ? "Combined PDF files exported successfully as ZIP"
          : type === "combined"
            ? "Combined Excel file exported successfully"
            : `${type === "evidence" ? "Evidence files" : type === "all-evidence" ? "All evidence files" : type === "all-workbooks" ? "All workbooks" : type.charAt(0).toUpperCase() + type.slice(1)} exported successfully${type === "all-evidence" || type === "all-workbooks" ? " as ZIP" : ` as ${format.toUpperCase()}`}`,
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
    <div className="h-full flex flex-col bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
      <div className="flex-shrink-0 border-b bg-gray-50/80 backdrop-blur-sm px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
        <p className="text-sm text-gray-600 mt-1">
          Export Extended Trial Balance, Adjustments, Reclassifications, and Evidence Files
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Export Combined Excel */}
          <div className="border rounded-lg p-4 space-y-3 bg-white/80 backdrop-blur-sm border-2 border-blue-300">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Combined Export</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Export Extended Trial Balance, Adjustments, and Reclassifications as Excel (multiple sheets) or PDF (separate files in ZIP)
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExport("combined", "xlsx")}
                    disabled={exporting !== null}
                    className="px-4"
                    size="sm"
                  >
                    {exporting === "combined" ? (
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
                    onClick={() => handleExport("combined", "pdf")}
                    disabled={exporting !== null}
                    className="px-4"
                    size="sm"
                    variant="outline"
                  >
                    {exporting === "combined_pdf" ? (
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

          {/* Export Extended Trial Balance */}
          <div className="border rounded-lg p-4 space-y-3 bg-white/80 backdrop-blur-sm">
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
                    className="px-4"
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
                    className="px-4"
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
          <div className="border rounded-lg p-4 space-y-3 bg-white/80 backdrop-blur-sm">
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
                    className="px-4"
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
                    className="px-4"
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
          <div className="border rounded-lg p-4 space-y-3 bg-white/80 backdrop-blur-sm">
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
                    className="px-4"
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
                    className="px-4"
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

          {/* Export Linked Evidence Files (ZIP) */}
          <div className="border rounded-lg p-4 space-y-3 bg-white/80 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FolderOpen className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Linked Evidence Files For the Adjustments and Reclassifications</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Export all evidence files linked to Adjustments and Reclassifications as a ZIP archive
                </p>
                <Button
                  onClick={() => handleExport("evidence")}
                  disabled={exporting !== null}
                  className="px-4"
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
                      Export Linked Evidence Files
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Export All Evidence Files (ZIP) - Globalized */}
          <div className="border rounded-lg p-4 space-y-3 bg-white/80 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FolderOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">All Evidence Files</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Export all evidence files for this engagement across all classifications as a ZIP archive
                </p>
                <Button
                  onClick={() => handleExport("all-evidence")}
                  disabled={exporting !== null}
                  className="px-4"
                  size="sm"
                  variant="outline"
                >
                  {exporting === "all-evidence" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export All Evidence Files
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Export All Workbooks (ZIP) - Globalized */}
          <div className="border rounded-lg p-4 space-y-3 bg-white/80 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">All Workbooks</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Export all workbooks for this engagement across all classifications as a ZIP archive
                </p>
                <Button
                  onClick={() => handleExport("all-workbooks")}
                  disabled={exporting !== null}
                  className="px-4"
                  size="sm"
                  variant="outline"
                >
                  {exporting === "all-workbooks" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export All Workbooks
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

