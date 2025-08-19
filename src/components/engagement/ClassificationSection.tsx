// @ts-nocheck
// @ts-nocheck

import type React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
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
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Search,
  Eye,
  Save,
  TableOfContents, // ⬅️ NEW: icon for Fetch Tabs
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedLoader } from "../ui/enhanced-loader";

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
  reference?: string;
}

interface WorksheetRow {
  sheetName: string;
  rowIndex: number;
  data: any[];
}

interface ViewRowData {
  reference: {
    sheetName: string;
    rowIndex: number;
    data: any[];
  };
  leadSheetRow: {
    code: string;
    accountName: string;
    currentYear: number;
    priorYear: number;
    adjustments: number;
    finalBalance: number;
  };
}

// ⬇️ NEW: for viewing full-sheet references
interface ViewSheetData {
  type: "sheet";
  sheet: { sheetName: string; data: any[][] };
  leadSheetRow: {
    code: string;
    accountName: string;
    currentYear: number;
    priorYear: number;
    adjustments: number;
    finalBalance: number;
  };
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

const isTopCategory = (c: string) =>
  ["Equity", "Income", "Expenses"].includes(c);
const isAdjustments = (c: string) => c === "Adjustments";
const isETB = (c: string) => c === "ETB";

const TOP_CATEGORIES = ["Equity", "Income", "Expenses"];

const shouldHaveWorkingPapers = (classification: string) => {
  return !isETB(classification) && !isAdjustments(classification);
};

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
    <div className="fixed inset-0 z-[40]">
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

// 🧭 small helpers for tab persistence via ?tab=
function getTabFromSearch(): "lead-sheet" | "working-papers" {
  try {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tab");
    return t === "working-papers" ? "working-papers" : "lead-sheet";
  } catch {
    return "lead-sheet";
  }
}
function setTabInSearch(tab: "lead-sheet" | "working-papers") {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
}

export const ClassificationSection: React.FC<ClassificationSectionProps> = ({
  engagement,
  classification,
  onClose,
  onClassificationJump,
}) => {
  const [loading, setLoading] = useState(true); // global loader (ETB / lead-sheet)
  const [wpHydrating, setWpHydrating] = useState(false); // dedicated loader for WP tab pulls
  const [sectionData, setSectionData] = useState<ETBRow[]>([]);
  const [viewSpreadsheetUrl, setViewSpreadsheetUrl] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [workingPapersInitialized, setWorkingPapersInitialized] =
    useState(false);
  const [workingPapersUrl, setWorkingPapersUrl] = useState<string>("");
  const [workingPapersId, setWorkingPapersId] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedRowForFetch, setSelectedRowForFetch] = useState<ETBRow | null>(
    null
  );
  const [fetchRowsDialog, setFetchRowsDialog] = useState(false);
  const [availableRows, setAvailableRows] = useState<WorksheetRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<WorksheetRow | null>(null);

  const [viewRowDialog, setViewRowDialog] = useState(false);
  const [viewRowData, setViewRowData] = useState<ViewRowData | null>(null);
  const [viewRowLoading, setViewRowLoading] = useState(false);

  // ⬇️ NEW: Fetch Tabs state
  const [fetchTabsDialog, setFetchTabsDialog] = useState(false);
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);

  // ⬇️ NEW: View full-sheet dialog state
  const [viewSheetDialog, setViewSheetDialog] = useState(false);
  const [viewSheetData, setViewSheetData] = useState<ViewSheetData | null>(null);
  const [viewSheetLoading, setViewSheetLoading] = useState(false);

  // 🔖 keep the tab stable across refresh / navigation
  const [activeTab, setActiveTab] = useState<"lead-sheet" | "working-papers">(
    () => getTabFromSearch()
  );
  useEffect(() => setTabInSearch(activeTab), [activeTab]);

  const { toast } = useToast();

  // 🔒 mounted ref to prevent setting state after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 🔁 AUTO-PULL guard: avoid duplicate pulls for the same classification
  const lastPulledRef = useRef<string | null>(null);

  // NEW: track whether we've already auto-loaded from DB for a given classification
  const wpFirstLoadedRef = useRef<Set<string>>(new Set());

  // 1) On classification change: clear UI immediately, then load fresh data and WP status
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (mountedRef.current) {
        setSectionData([]);
        setWorkingPapersInitialized(false);
        setWorkingPapersUrl("");
        setWorkingPapersId("");
        setAvailableSheets([]);
        setViewRowDialog(false);
        setViewRowData(null);
        // clear new dialogs as well
        setFetchTabsDialog(false);
        setAvailableTabs([]);
        setSelectedTab(null);
        setViewSheetDialog(false);
        setViewSheetData(null);
      }

      const showWpLoader =
        shouldHaveWorkingPapers(classification) &&
        activeTab === "working-papers";
      if (showWpLoader) setWpHydrating(true);
      setLoading(true);

      try {
        await loadSectionData();
        await loadWorkingPaperFromDB(true);
        if (shouldHaveWorkingPapers(classification)) {
          await checkWorkingPapersStatus();
        } else {
          if (!cancelled && mountedRef.current) {
            setWorkingPapersInitialized(false);
            setWorkingPapersUrl("");
            setWorkingPapersId("");
            setAvailableSheets([]);
          }
        }
      } catch (e) {
        // errors already toasted in helpers
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
          setWpHydrating(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classification]);

  const loadSectionData = async () => {
    try {
      if (isAdjustments(classification) || isETB(classification)) {
        const etbResp = await authFetch(
          `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`
        );
        if (!etbResp.ok) throw new Error("Failed to load ETB");
        const etb = await etbResp.json();
        const rows: ETBRow[] = Array.isArray(etb.rows) ? etb.rows : [];
        if (!mountedRef.current) return;
        setSectionData(
          isAdjustments(classification)
            ? rows.filter((r) => Number(r.adjustments) !== 0)
            : rows
        );
        return;
      }

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
      if (!mountedRef.current) return;
      setSectionData(Array.isArray(data.rows) ? data.rows : []);
    } catch (error: any) {
      console.error("Load error:", error);
      toast({
        title: "Load failed",
        description: error.message,
        variant: "destructive",
      });
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
      if (mountedRef.current)
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
      if (mountedRef.current) setLoading(false);
    }
  };

  // one helper to cache-bust a url
  function withVersion(rawUrl: string) {
    if (!rawUrl) return rawUrl;
    try {
      const u = new URL(rawUrl);
      u.searchParams.set("v", String(Date.now()));
      return u.toString();
    } catch {
      const join = rawUrl.includes("?") ? "&" : "?";
      return `${rawUrl}${join}v=${Date.now()}`;
    }
  }

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
      const freshUrl = withVersion(result.viewUrl);
      if (mountedRef.current) setViewSpreadsheetUrl(freshUrl);

      toast({ title: "Success", description: "Spreadsheet Saved in Library" });
    } catch (error: any) {
      console.error("Create view spreadsheet error:", error);
      toast({
        title: "Create failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ⬇️ RETURN status so the caller can decide to auto-pull
  const checkWorkingPapersStatus = async () => {
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${
          engagement._id
        }/sections/${encodeURIComponent(classification)}/working-papers/status`
      );
      if (response.ok) {
        const data = await response.json();
        if (!mountedRef.current) return;
        setWorkingPapersInitialized(data.initialized);
        setWorkingPapersUrl(data.url || "");
        setWorkingPapersId(data.spreadsheetId || "");
        setAvailableSheets(data.sheets || []);
        return data as {
          initialized: boolean;
          url?: string;
          spreadsheetId?: string;
          sheets?: string[];
        };
      }
    } catch (error) {
      console.error("Error checking working papers status:", error);
    }
  };

  const initializeWorkingPapers = async () => {
    if (activeTab === "working-papers") setWpHydrating(true);
    setLoading(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${
          engagement._id
        }/sections/${encodeURIComponent(classification)}/working-papers/init`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadSheetData: sectionData }),
        }
      );

      if (!response.ok) throw new Error("Failed to initialize working papers");

      const result = await response.json();
      if (!mountedRef.current) return;

      setWorkingPapersInitialized(true);
      setWorkingPapersUrl(result.url);
      setWorkingPapersId(result.spreadsheetId);
      setAvailableSheets(result.sheets || []);
      lastPulledRef.current = null;

      window.open(result.url, "_blank", "noopener,noreferrer");

      toast({
        title: "Success",
        description: "Working papers initialized with lead sheet data",
      });
    } catch (error: any) {
      console.error("Initialize working papers error:", error);
      toast({
        title: "Initialize failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setWpHydrating(false);
      }
    }
  };

  // Save Working Paper (DB)
  const saveWorkingPaperToDB = async () => {
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/db`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: sectionData }),
        }
      );
      if (!response.ok) throw new Error("Failed to save Working Paper to DB");
      toast({ title: "Saved", description: "Working Paper saved to database." });
    } catch (error: any) {
      console.error("Save WP to DB error:", error);
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load Working Paper (DB)
  // ⬅️ returns boolean: true if rows were loaded from DB, false otherwise
  const loadWorkingPaperFromDB = async (silent = false): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/db`
      );
      if (response.ok) {
        const json = await response.json();
        if (!mountedRef.current) return false;
        setSectionData(Array.isArray(json.rows) ? json.rows : []);
        if (!silent) {
          toast({
            title: "Loaded",
            description: "Working Paper loaded from database.",
          });
        }
        return true;
      } else {
        if (!silent && response.status !== 404) {
          toast({
            title: "Load failed",
            description: `(${response.status})`,
            variant: "destructive",
          });
        }
        return false;
      }
    } catch (error: any) {
      if (!silent) {
        console.error("Load WP from DB error:", error);
        toast({
          title: "Load failed",
          description: error.message,
          variant: "destructive",
        });
      }
      return false;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const pushToWorkingPapers = async () => {
    if (activeTab === "working-papers") setWpHydrating(true);
    else setLoading(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${
          engagement._id
        }/sections/${encodeURIComponent(classification)}/working-papers/push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: sectionData }),
        }
      );

      if (!response.ok) throw new Error("Failed to push to working papers");

      toast({
        title: "Success",
        description: "Changes pushed to working papers successfully",
      });
    } catch (error: any) {
      console.error("Push to working papers error:", error);
      toast({
        title: "Push failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) {
        if (activeTab === "working-papers") setWpHydrating(false);
        else setLoading(false);
      }
    }
  };

  // 🔧 pull now supports an explicit loader mode so WP tab can show its own loader
  const pullFromWorkingPaper = async (
    clas: string,
    opts?: { mode?: "global" | "wp" }
  ) => {
    const mode =
      opts?.mode || (activeTab === "working-papers" ? "wp" : "global");
    if (mode === "wp") setWpHydrating(true);
    else setLoading(true);

    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${
          engagement._id
        }/sections/${encodeURIComponent(clas)}/working-papers/pull`,
        { method: "POST" }
      );

      if (!response.ok) throw new Error("Failed to pull from working papers");

      const result = await response.json();
      if (!mountedRef.current) return;
      setSectionData(result.rows);
      setAvailableSheets(result.sheets || []);

      toast({
        title: "Success",
        description: "Changes pulled from working papers successfully",
      });
    } catch (error: any) {
      console.error("Pull from working papers error:", error);
      toast({
        title: "Pull failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) {
        if (mode === "wp") setWpHydrating(false);
        else setLoading(false);
      }
    }
  };

  const fetchRowsFromSheets = async (row: ETBRow) => {
    setSelectedRowForFetch(row);
    if (activeTab === "working-papers") setWpHydrating(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${
          engagement._id
        }/sections/${encodeURIComponent(
          classification
        )}/working-papers/fetch-rows`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowId: row.id }),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch rows from sheets");

      const result = await response.json();
      if (!mountedRef.current) return;
      setAvailableRows(result.rows);
      setFetchRowsDialog(true);
    } catch (error: any) {
      console.error("Fetch rows error:", error);
      toast({
        title: "Fetch failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) setWpHydrating(false);
    }
  };

  const selectRowFromSheets = async () => {
    if (!selectedRow || !selectedRowForFetch) return;
    if (activeTab === "working-papers") setWpHydrating(true);

    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${
          engagement._id
        }/sections/${encodeURIComponent(
          classification
        )}/working-papers/select-row`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rowId: selectedRowForFetch.id,
            selectedRow: selectedRow,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to select row");

      const result = await response.json();
      if (!mountedRef.current) return;
      setSectionData(result.rows);
      setFetchRowsDialog(false);
      setSelectedRow(null);
      setSelectedRowForFetch(null);

      toast({ title: "Success", description: "Row selected and data updated" });
    } catch (error: any) {
      console.error("Select row error:", error);
      toast({
        title: "Select failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) {
        setWpHydrating(false);
        setFetchRowsDialog(false);
      }
    }
  };

  // ⬇️ NEW: Fetch list of worksheet tabs (excluding Sheet1)
  const fetchTabsForRow = async (row: ETBRow) => {
    setSelectedRowForFetch(row);
    if (activeTab === "working-papers") setWpHydrating(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(
          classification
        )}/working-papers/fetch-tabs`,
        { method: "POST" }
      );
      if (!response.ok) throw new Error("Failed to fetch tabs");
      const result = await response.json();
      if (!mountedRef.current) return;
      setAvailableTabs(Array.isArray(result.tabs) ? result.tabs : []);
      setSelectedTab(null);
      setFetchTabsDialog(true);
    } catch (error: any) {
      console.error("Fetch tabs error:", error);
      toast({
        title: "Fetch failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) setWpHydrating(false);
    }
  };

  // ⬇️ NEW: Select a worksheet to reference the full sheet (server makes it mutually exclusive with row ref)
  const selectTabForRow = async () => {
    if (!selectedTab || !selectedRowForFetch) return;
    if (activeTab === "working-papers") setWpHydrating(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(
          classification
        )}/working-papers/select-tab`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowId: selectedRowForFetch.id, sheetName: selectedTab }),
        }
      );
      if (!response.ok) throw new Error("Failed to select sheet");
      const result = await response.json();
      if (!mountedRef.current) return;
      setSectionData(result.rows);
      setFetchTabsDialog(false);
      setSelectedTab(null);
      setSelectedRowForFetch(null);
      toast({ title: "Success", description: "Sheet selected. Reference updated." });
    } catch (error: any) {
      console.error("Select tab error:", error);
      toast({
        title: "Select failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) {
        setWpHydrating(false);
        setFetchTabsDialog(false);
      }
    }
  };

  // ✅ KEEP existing row-view flow, and ADD transparent support for sheet-view (no behavior change for rows)
  const viewSelectedRow = async (row: ETBRow) => {
    if (!row.reference) return;

    // If the reference is a full-sheet ref like "Sheet:Summary", use the new endpoint,
    // but DON'T alter the existing row-view behavior otherwise.
    if (typeof row.reference === "string" && row.reference.startsWith("Sheet:")) {
      if (activeTab === "working-papers") setWpHydrating(true);
      setViewSheetLoading(true);
      try {
        const response = await authFetch(
          `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(
            classification
          )}/working-papers/view-reference`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rowId: row.id }),
          }
        );
        if (!response.ok) throw new Error("Failed to view sheet reference");
        const result = await response.json();
        if (!mountedRef.current) return;

        // Expecting: { type: 'sheet', sheet: { sheetName, data }, leadSheetRow: {...} }
        setViewSheetData(result);
        setViewSheetDialog(true);
      } catch (error: any) {
        console.error("View sheet error:", error);
        toast({
          title: "View failed",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        if (mountedRef.current) {
          setViewSheetLoading(false);
          setWpHydrating(false);
        }
      }
      return;
    }

    // —— original row-view behavior (unchanged) ——
    if (activeTab === "working-papers") setWpHydrating(true);
    setViewRowLoading(true);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${
          engagement._id
        }/sections/${encodeURIComponent(
          classification
        )}/working-papers/view-row`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowId: row.id }),
        }
      );

      if (!response.ok) throw new Error("Failed to view selected row");

      const result = await response.json();
      if (!mountedRef.current) return;
      setViewRowData(result);
      setViewRowDialog(true);
    } catch (error: any) {
      console.error("View row error:", error);
      toast({
        title: "View failed, Does the Row Exist?",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (mountedRef.current) {
        setViewRowLoading(false);
        setWpHydrating(false);
      }
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

  // NEW: when switching to the Working Papers tab for the FIRST time on a classification,
  // load rows from DB and show them.
  useEffect(() => {
    const doFirstLoad = async () => {
      if (
        activeTab === "working-papers" &&
        shouldHaveWorkingPapers(classification) &&
        !wpFirstLoadedRef.current.has(classification)
      ) {
        wpFirstLoadedRef.current.add(classification);
        await checkWorkingPapersStatus();
        await loadWorkingPaperFromDB(false);
      }
    };
    doFirstLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, classification]);

  // Global loader (covers Lead Sheet / ETB loads and first mount)
  if (loading && activeTab !== "working-papers") {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader
          variant="pulse"
          size="lg"
          text="Loading Classifications..."
        />
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
              className="h-9 w-9 bg-transparent"
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
              variant="outline"
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
  const workingPapersActions = (
  <div className="flex items-center gap-2">
    <TooltipProvider delayDuration={200}>
      {!workingPapersInitialized ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={initializeWorkingPapers}
              size="sm"
              disabled={wpHydrating}
            >
              <Plus className="h-4 w-4 mr-2" />
              Initialize
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Initialize working papers with lead sheet data
          </TooltipContent>
        </Tooltip>
      ) : (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={pushToWorkingPapers}
                variant="outline"
                size="sm"
                disabled={wpHydrating}
              >
                <Upload className="h-4 w-4 mr-2" />
                Push
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Push changes to working papers
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => pullFromWorkingPaper(classification, { mode: "wp" })}
                variant="outline"
                size="sm"
                disabled={wpHydrating}
              >
                <Download className="h-4 w-4 mr-2" />
                Pull
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Pull changes from working papers
            </TooltipContent>
          </Tooltip>

          {workingPapersUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() =>
                    window.open(workingPapersUrl, "_blank", "noopener,noreferrer")
                  }
                  variant="outline"
                  size="sm"
                  disabled={wpHydrating}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Open Excel
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                Open working papers in Excel
              </TooltipContent>
            </Tooltip>
          )}

          {/* NEW: Save to DB */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={saveWorkingPaperToDB}
                size="sm"
                variant="outline"
                disabled={wpHydrating || sectionData.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Working Papers
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Save current Working Paper rows to the database
            </TooltipContent>
          </Tooltip>

          {/* NEW: Load from DB */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => loadWorkingPaperFromDB(false)}
                size="sm"
                variant="outline"
                disabled={wpHydrating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Load from DB
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Load saved Working Paper rows from the database
            </TooltipContent>
          </Tooltip>
        </>
      )}
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
              {sectionData.length}{" "}
              {sectionData.length === 1 ? "account" : "accounts"}
            </Badge>
          </div>
          {headerActions}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {shouldHaveWorkingPapers(classification) ? (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="flex-1 flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lead-sheet">Lead Sheet</TabsTrigger>
              <TabsTrigger value="working-papers">Working Papers</TabsTrigger>
            </TabsList>

            <TabsContent value="lead-sheet" className="flex-1 flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <EnhancedLoader
                    variant="pulse"
                    size="lg"
                    text="Loading Lead Sheet..."
                  />
                </div>
              ) : (
                renderLeadSheetContent()
              )}
            </TabsContent>

            <TabsContent
              value="working-papers"
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Working Papers</h3>
                {workingPapersActions}
              </div>

              {/* WP-specific loader */}
              {wpHydrating ? (
                <div className="flex items-center justify-center h-64">
                  <EnhancedLoader
                    variant="glow"
                    size="lg"
                    text="Syncing Working Papers..."
                  />
                </div>
              ) : workingPapersInitialized ? (
                renderWorkingPapersContent()
              ) : (
                renderWorkingPapersEmpty()
              )}
            </TabsContent>
          </Tabs>
        ) : // ETB / Adjustments live outside WP
        loading ? (
          <div className="flex items-center justify-center h-64">
            <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
          </div>
        ) : (
          renderLeadSheetContent()
        )}

        {/* Fetch Rows Dialog (existing) */}
        <Dialog open={fetchRowsDialog} onOpenChange={setFetchRowsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto z-[200]">
            <DialogHeader>
              <DialogTitle>Select Row from Other Sheets</DialogTitle>
              <DialogDescription>
                Choose a row from the available sheets to reference for{" "}
                {selectedRowForFetch?.accountName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {availableRows.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    onValueChange={(value) => {
                      const row = availableRows.find(
                        (r, i) => i.toString() === value
                      );
                      setSelectedRow(row || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a row..." />
                    </SelectTrigger>

                    <SelectContent
                      position="popper"
                      sideOffset={8}
                      className="z-[300]"
                    >
                      {availableRows.map((row, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {row.sheetName} - Row {row.rowIndex}:{" "}
                          {row.data.slice(0, 3).join(" | ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedRow && (
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <h4 className="font-medium mb-2">
                        Selected Row Preview:
                      </h4>
                      <p>
                        <strong>Sheet:</strong> {selectedRow.sheetName}
                      </p>
                      <p>
                        <strong>Row:</strong> {selectedRow.rowIndex}
                      </p>
                      <p>
                        <strong>Data:</strong> {selectedRow.data.join(" | ")}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setFetchRowsDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={selectRowFromSheets}
                      disabled={!selectedRow || wpHydrating}
                    >
                      {wpHydrating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Select Row
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No rows found in other sheets
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ⬇️ NEW: Fetch Tabs Dialog */}
        <Dialog open={fetchTabsDialog} onOpenChange={setFetchTabsDialog}>
          <DialogContent className="max-w-xl z-[200]">
            <DialogHeader>
              <DialogTitle>Select a Worksheet</DialogTitle>
              <DialogDescription>
                Choose a worksheet to reference the <em>entire sheet</em> for{" "}
                {selectedRowForFetch?.accountName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {availableTabs.length > 0 ? (
                <>
                  <Select onValueChange={(v) => setSelectedTab(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a worksheet..." />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={8} className="z-[300]">
                      {availableTabs.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setFetchTabsDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={selectTabForRow} disabled={!selectedTab || wpHydrating}>
                      {wpHydrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Select Sheet
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">No extra worksheets found</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Existing Row View Dialog (unchanged) */}
        <Dialog open={viewRowDialog} onOpenChange={setViewRowDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto z-[200]">
            <DialogHeader>
              <DialogTitle>View Referenced Row</DialogTitle>
              <DialogDescription>
                Viewing the referenced data for the selected account
              </DialogDescription>
            </DialogHeader>

            {viewRowData ? (
              <div className="space-y-6">
                {/* Lead Sheet Row Info */}
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-medium mb-3 text-blue-900">
                    Lead Sheet Account
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Code:</span>{" "}
                      {viewRowData.leadSheetRow.code}
                    </div>
                    <div>
                      <span className="font-medium">Account Name:</span>{" "}
                      {viewRowData.leadSheetRow.accountName}
                    </div>
                    <div>
                      <span className="font-medium">Current Year:</span>{" "}
                      {viewRowData.leadSheetRow.currentYear.toLocaleString()}
                    </div>

                    <div>
                      <span className="font-medium">Adjustments:</span>{" "}
                      {viewRowData.leadSheetRow.adjustments.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Final Balance:</span>{" "}
                      {viewRowData.leadSheetRow.finalBalance.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Prior Year:</span>{" "}
                      {viewRowData.leadSheetRow.priorYear.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Referenced Row Info */}
                <div className="p-4 border rounded-lg bg-green-50">
                  <h4 className="font-medium mb-3 text-green-900">
                    Referenced Working Paper
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Sheet:</span>{" "}
                      {viewRowData.reference.sheetName}
                    </div>
                    <div>
                      <span className="font-medium">Row:</span>{" "}
                      {viewRowData.reference.rowIndex}
                    </div>
                    <div>
                      <span className="font-medium">Data:</span>
                      <div className="mt-2 p-3 bg-white border rounded text-xs font-mono">
                        {viewRowData.reference.data.join(" | ")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setViewRowDialog(false)}>Close</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading reference data...</span>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ⬇️ NEW: View Full-Sheet Dialog */}
        <Dialog open={viewSheetDialog} onOpenChange={setViewSheetDialog}>
          <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto z-[200]">
            <DialogHeader>
              <DialogTitle>Reference Preview (Full Sheet)</DialogTitle>
              <DialogDescription>
                {viewSheetData?.type === "sheet"
                  ? <>Full sheet: <strong>{viewSheetData.sheet.sheetName}</strong></>
                  : "—"}
              </DialogDescription>
            </DialogHeader>

            {viewSheetLoading ? (
              <div className="flex items-center justify-center h-48">
                <EnhancedLoader variant="pulse" size="lg" text="Loading preview..." />
              </div>
            ) : viewSheetData?.type === "sheet" ? (
              renderSheetTable(viewSheetData.sheet.data)
            ) : (
              <p className="text-muted-foreground">No reference to preview.</p>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );

  function renderLeadSheetContent() {
    return (
      <>
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

        {renderDataTable()}
      </>
    );
  }

  function renderWorkingPapersContent() {
    return (
      <>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-3">
            <div className="text-xs text-gray-500">Available Sheets</div>
            <div className="text-lg font-semibold">
              {availableSheets.length}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Current Year</div>
            <div className="text-lg font-semibold">
              {totals.currentYear.toLocaleString()}
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

        {renderWorkingPapersTable()}
      </>
    );
  }

  function renderWorkingPapersEmpty() {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Working Papers Not Initialized
            </h3>
            <p className="text-gray-500 mt-1">
              Click the Initialize button to create working papers with lead
              sheet data
            </p>
          </div>
          <Button
            onClick={initializeWorkingPapers}
            size="lg"
            disabled={wpHydrating}
          >
            <Plus className="h-5 w-5 mr-2" />
            Initialize Working Papers
          </Button>
        </div>
      </div>
    );
  }

  function renderWorkingPapersTable() {
    return (
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
                <th className="px-4 py-2 text-left">Reference</th>
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
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewSelectedRow(row)}
                        disabled={
                          !row.reference || viewRowLoading || wpHydrating
                        }
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchRowsFromSheets(row)}
                        disabled={availableSheets.length <= 1 || wpHydrating}
                      >
                        <Search className="h-3 w-3 mr-1" />
                        Fetch Rows
                      </Button>
                      {/* ⬇️ NEW: Fetch Tabs button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchTabsForRow(row)}
                        disabled={availableSheets.length <= 1 || wpHydrating}
                      >
                        <TableOfContents className="h-3 w-3 mr-1" />
                        Fetch Tabs
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sectionData.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No data available for working papers
                  </td>
                </tr>
              )}
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
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ⬇️ NEW: pretty table renderer for full-sheet preview
  function renderSheetTable(data: any[][]) {
    if (!data?.length) return <p className="text-center text-muted-foreground py-6">Empty sheet</p>;
    const hdr = data[0] || [];
    const rows = data.slice(1);
    return (
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {hdr.map((h: any, i: number) => (
                // <th key={i} className="px-3 py-2 text-left">{String(h ?? "")}</th>
                <td key={i} className="px-3 py-2">{String(h ?? "")}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any[], ri: number) => (
              <tr key={ri} className="border-t">
                {r.map((c: any, ci: number) => (
                  <td key={ci} className="px-3 py-2">{String(c ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  function renderDataTable() {
    if (isETB(classification)) {
      // ETB view
      return (
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
                    <td>
                      <button
                        onClick={() =>
                          onClassificationJump?.(row.classification)
                        }
                        className="flex items-center gap-2"
                      >
                        <Badge variant="outline">
                          {formatClassificationForDisplay(row.classification)}
                        </Badge>
                      </button>
                    </td>
                  </tr>
                ))}
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
                {sectionData.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No ETB rows found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (isAdjustments(classification)) {
      // Adjustments view: grouped by top categories
      return (
        <div className="overflow-auto max-h-96 space-y-6">
          {Object.entries(groupedForAdjustments).map(([cls, items]) => {
            const subtotal = items.reduce(
              (acc, r) => ({
                currentYear: acc.currentYear + (Number(r.currentYear) || 0),
                priorYear: acc.priorYear + (Number(r.priorYear) || 0),
                adjustments: acc.adjustments + (Number(r.adjustments) || 0),
                finalBalance: acc.finalBalance + (Number(r.finalBalance) || 0),
              }),
              { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 }
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
                          <td className="px-4 py-2 font-mono text-xs">
                            {row.code}
                          </td>
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
      );
    } else {
      // Normal classification/category table
      return (
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
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No data available for this classification
                    </td>
                  </tr>
                )}
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
      );
    }
  }

  // Inline (normal) vs fullscreen (portal)
  if (!isFullscreen) {
    return <div className="h-full flex flex-col">{content}</div>;
  }

  return (
    <FullscreenOverlay onExit={() => setIsFullscreen(false)}>
      <div className="absolute right-4 top-4 z-10">
        {/* Exit button handled by FullscreenOverlay */}
      </div>
      <div className="h-full w-full overflow-auto">{content}</div>
    </FullscreenOverlay>
  );
};
