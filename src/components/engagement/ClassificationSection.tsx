"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClassificationSectionProps {
  engagement: any;
  classification: string;
  onClose?: () => void;
  onClassificationJump?: (classification: string) => void;
}

interface ETBRow {
  id: string;
  code: string;
  accountName: string;
  currentYear: number;
  priorYear: number;
  adjustments: number;
  finalBalance: number;
  classification: string;
}

// 🔹 Auth fetch helper: attaches Supabase Bearer token
async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const headers = new Headers(options.headers || {});
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  return fetch(url, { ...options, headers });
}

const isTopCategory = (c: string) => ["Equity", "Income", "Expenses"].includes(c);
const isAdjustments = (c: string) => c === "Adjustments";
const isETB = (c: string) => c === "ETB";

const TOP_CATEGORIES = ["Equity", "Income", "Expenses"];

const groupByClassification = (
  rows: ETBRow[],
  collapseToTopCategory = false
) => {
  const grouped: Record<string, ETBRow[]> = {};
  for (const r of rows) {
    let key = r.classification || "Unclassified";
    if (collapseToTopCategory && key.includes(" > ")) {
      const top = key.split(" > ")[0];
      if (TOP_CATEGORIES.includes(top)) key = top;
    }
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }
  return grouped;
};

// ✅ Unified display rule
const formatClassificationForDisplay = (c: string) => {
  if (!c) return "—";
  if (isAdjustments(c)) return "Adjustments";
  if (isETB(c)) return "Extended Trial Balance";
  const parts = c.split(" > ");
  const top = parts[0];
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1];
  return top;
};

/* -----------------------------
   Fullscreen wrapper (Portal)
------------------------------*/
function FullscreenOverlay({
  children,
  onExit,
}: {
  children: React.ReactNode;
  onExit: () => void;
}) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  // Render to body
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 opacity-100 transition-opacity duration-200"
        onClick={onExit}
      />
      {/* Content container */}
      <div className="absolute inset-0 flex p-4 sm:p-6">
        <div
          className="
            relative w-full h-full
            bg-background rounded-xl shadow-xl
            transition-all duration-200
            opacity-100 scale-[1.00]
            border
          "
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export const ClassificationSection: React.FC<ClassificationSectionProps> = ({
  engagement,
  classification,
  onClose,
  onClassificationJump,
}) => {
  const [loading, setLoading] = useState(false);
  const [sectionData, setSectionData] = useState<ETBRow[]>([]);
  const [viewSpreadsheetUrl, setViewSpreadsheetUrl] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSectionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classification]);

  const loadSectionData = async () => {
    setLoading(true);
    try {
      if (isAdjustments(classification) || isETB(classification)) {
        // Use the same ETB endpoint; no new APIs
        const etbResp = await authFetch(
          `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`
        );
        if (!etbResp.ok) throw new Error("Failed to load ETB");
        const etb = await etbResp.json();
        const rows: ETBRow[] = Array.isArray(etb.rows) ? etb.rows : [];
        setSectionData(
          isAdjustments(classification)
            ? rows.filter((r) => Number(r.adjustments) !== 0)
            : rows
        );
        return;
      }

      // Normal paths (server provides data by classification or by category)
      const endpoint = isTopCategory(classification)
        ? `${import.meta.env.VITE_APIURL}/api/engagements/${
            engagement._id
          }/etb/category/${encodeURIComponent(classification)}`
        : `${import.meta.env.VITE_APIURL}/api/engagements/${
            engagement._id
          }/etb/classification/${encodeURIComponent(classification)}`;

      const response = await authFetch(endpoint);
      if (!response.ok) throw new Error("Failed to load section data");
      const data = await response.json();
      setSectionData(Array.isArray(data.rows) ? data.rows : []);
    } catch (error: any) {
      console.error("Load error:", error);
      toast({
        title: "Load failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reloadDataFromETB = async () => {
    setLoading(true);
    try {
      if (isAdjustments(classification) || isETB(classification)) {
        await loadSectionData();
        toast({
          title: "Success",
          description: "Data reloaded from ETB successfully",
        });
        return;
      }

      const endpoint = isTopCategory(classification)
        ? `${import.meta.env.VITE_APIURL}/api/engagements/${
            engagement._id
          }/etb/category/${encodeURIComponent(classification)}`
        : `${import.meta.env.VITE_APIURL}/api/engagements/${
            engagement._id
          }/etb/classification/${encodeURIComponent(classification)}/reload`;

      const response = await authFetch(endpoint, {
        method: isTopCategory(classification) ? "GET" : "POST",
      });
      if (!response.ok) throw new Error("Failed to reload data from ETB");

      const data = await response.json();
      setSectionData(Array.isArray(data.rows) ? data.rows : []);
      toast({
        title: "Success",
        description: "Data reloaded from ETB successfully",
      });
    } catch (error: any) {
      console.error("Reload error:", error);
      toast({
        title: "Reload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createViewSpreadsheet = async () => {
    setLoading(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${
          engagement._id
        }/sections/${encodeURIComponent(classification)}/view-spreadsheet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: sectionData }),
        }
      );
      if (!response.ok) throw new Error("Failed to create view spreadsheet");
      const result = await response.json();
      setViewSpreadsheetUrl(result.viewUrl);
      // window.open(result.viewUrl, "_blank");
      toast({
        title: "Success",
        description: "Spreadsheet Saved in Library",
      });
    } catch (error: any) {
      console.error("Create view spreadsheet error:", error);
      toast({
        title: "Create failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(
    () =>
      sectionData.reduce(
        (acc, row) => ({
          currentYear: acc.currentYear + (Number(row.currentYear) || 0),
          priorYear: acc.priorYear + (Number(row.priorYear) || 0),
          adjustments: acc.adjustments + (Number(row.adjustments) || 0),
          finalBalance: acc.finalBalance + (Number(row.finalBalance) || 0),
        }),
        { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 }
      ),
    [sectionData]
  );

  // Grouping for Adjustments view
  const groupedForAdjustments = useMemo(
    () =>
      isAdjustments(classification)
        ? groupByClassification(sectionData, true)
        : {},
    [classification, sectionData]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading…</span>
      </div>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setIsFullscreen((v) => !v)}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={reloadDataFromETB} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Data
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Reload rows from ETB
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={createViewSpreadsheet}
              disabled={sectionData.length === 0}
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Save As Spreadsheet
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Save this section as a view-only spreadsheet
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  const content = (
    <Card className="flex-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {formatClassificationForDisplay(classification)}
            </CardTitle>
            <Badge variant="outline" className="mt-1">
              {sectionData.length} {sectionData.length === 1 ? "account" : "accounts"}
            </Badge>
          </div>
          {headerActions}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-3">
            <div className="text-xs text-gray-500">Current Year</div>
            <div className="text-lg font-semibold">
              {totals.currentYear.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Prior Year</div>
            <div className="text-lg font-semibold">
              {totals.priorYear.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Adjustments</div>
            <div className="text-lg font-semibold">
              {totals.adjustments.toLocaleString()}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Final Balance</div>
            <div className="text-lg font-semibold">
              {totals.finalBalance.toLocaleString()}
            </div>
          </Card>
        </div>

        {/* Tables */}
        {isETB(classification) ? (
          // ETB view
          <div className="flex-1 border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Account Name</th>
                    <th className="px-4 py-2 text-right">Current Year</th>
                    <th className="px-4 py-2 text-right">Prior Year</th>
                    <th className="px-4 py-2 text-right">Adjustments</th>
                    <th className="px-4 py-2 text-right">Final Balance</th>
                    <th className="px-4 py-2 text-left">Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionData.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                      <td className="px-4 py-2">{row.accountName}</td>
                      <td className="px-4 py-2 text-right">
                        {row.currentYear.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {row.priorYear.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {row.adjustments.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {row.finalBalance.toLocaleString()}
                      </td>
                      {/* ✅ formatted display */}
                      <td>
                        <button
                          onClick={() => onClassificationJump?.(row.classification)}
                          className="flex items-center gap-2"
                        >
                          {/* Show formatted name next to dropdown for quick glance */}
                          <Badge variant="outline">
                            {formatClassificationForDisplay(row.classification)}
                          </Badge>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sectionData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No ETB rows found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : isAdjustments(classification) ? (
          // Adjustments view: grouped by top categories
          <div className="overflow-auto max-h-96 space-y-6">
            {Object.entries(groupedForAdjustments).map(([cls, items]) => {
              const subtotal = items.reduce(
                (acc, r) => ({
                  currentYear: acc.currentYear + (Number(r.currentYear) || 0),
                  priorYear: acc.priorYear + (Number(r.priorYear) || 0),
                  adjustments: acc.adjustments + (Number(r.adjustments) || 0),
                  finalBalance: acc.finalBalance + (Number(r.finalBalance) || 0),
                }),
                {
                  currentYear: 0,
                  priorYear: 0,
                  adjustments: 0,
                  finalBalance: 0,
                }
              );
              return (
                <div key={cls} className="border rounded-lg ">
                  <div className="px-4 py-2 border-b bg-gray-50 font-medium">
                    {formatClassificationForDisplay(cls) || "Unclassified"}
                  </div>
                  <div className="">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left">Code</th>
                          <th className="px-4 py-2 text-left">Account Name</th>
                          <th className="px-4 py-2 text-right">Current Year</th>
                          <th className="px-4 py-2 text-right">Prior Year</th>
                          <th className="px-4 py-2 text-right">Adjustments</th>
                          <th className="px-4 py-2 text-right">Final Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((row) => (
                          <tr key={row.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                            <td className="px-4 py-2">{row.accountName}</td>
                            <td className="px-4 py-2 text-right">
                              {row.currentYear.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {row.priorYear.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right font-medium">
                              {row.adjustments.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {row.finalBalance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-muted/50 font-medium border-t">
                          <td className="px-4 py-2" colSpan={2}>
                            Subtotal
                          </td>
                          <td className="px-4 py-2 text-right">
                            {subtotal.currentYear.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {subtotal.priorYear.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {subtotal.adjustments.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {subtotal.finalBalance.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Grand Totals for Adjustments */}
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b bg-gray-50 font-medium">
                Adjustments — Grand Total
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 font-medium">Current Year</td>
                      <td className="px-4 py-2 text-right">
                        {totals.currentYear.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Prior Year</td>
                      <td className="px-4 py-2 text-right">
                        {totals.priorYear.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Adjustments</td>
                      <td className="px-4 py-2 text-right">
                        {totals.adjustments.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium">Final Balance</td>
                      <td className="px-4 py-2 text-right">
                        {totals.finalBalance.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          // Normal classification/category table (✅ totals row included here)
          <div className="flex-1 border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Account Name</th>
                    <th className="px-4 py-2 text-right">Current Year</th>
                    <th className="px-4 py-2 text-right">Prior Year</th>
                    <th className="px-4 py-2 text-right">Adjustments</th>
                    <th className="px-4 py-2 text-right">Final Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionData.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                      <td className="px-4 py-2">{row.accountName}</td>
                      <td className="px-4 py-2 text-right">
                        {row.currentYear.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {row.priorYear.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {row.adjustments.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {row.finalBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {sectionData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No data available for this classification
                      </td>
                    </tr>
                  )}
                  {/* Totals row for normal sections */}
                  {sectionData.length > 0 && (
                    <tr className="bg-muted/50 font-medium">
                      <td className="px-4 py-2" colSpan={2}>
                        TOTALS
                      </td>
                      <td className="px-4 py-2 text-right">
                        {totals.currentYear.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {totals.priorYear.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {totals.adjustments.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {totals.finalBalance.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Inline (normal) vs fullscreen (portal)
  if (!isFullscreen) {
    return <div className="h-full flex flex-col">{content}</div>;
  }

  return (
    <FullscreenOverlay onExit={() => setIsFullscreen(false)}>
      <div className="absolute right-4 top-4 z-10">
        {/* <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 shadow"
                onClick={() => setIsFullscreen(false)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center">
              Exit full screen
            </TooltipContent>
          </Tooltip>
        </TooltipProvider> */}
      </div>
      <div className="h-full w-full overflow-auto">{content}</div>
    </FullscreenOverlay>
  );
};
