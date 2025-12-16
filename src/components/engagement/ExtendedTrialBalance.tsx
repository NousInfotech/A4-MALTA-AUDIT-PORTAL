// @ts-nocheck
import React from "react";
import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Save,
  Calculator,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronsUpDown,
  Check,
  RefreshCw,
  ExternalLink,
  CloudUpload,
  CloudDownload,
  X,
  Info,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { EnhancedLoader } from "../ui/enhanced-loader";
import EditableText from "../ui/editable-text";
import { NEW_CLASSIFICATION_OPTIONS, NEW_CLASSIFICATION_RULESET } from "./classificationOptions";
import { adjustmentApi, reclassificationApi } from "@/services/api";

/* -------------------------------------------------------
   Helpers & Types
------------------------------------------------------- */

// Parse accounting number formats: (55,662) → 55662, 42,127 → 42127
// Removes parentheses and special characters, preserves any existing minus sign
// Returns rounded integer value
const parseAccountingNumber = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;

  // If already a number, round and return it
  if (typeof value === "number") return Math.round(value);

  // Convert to string and clean
  let str = String(value).trim();

  // Remove parentheses, commas, and currency symbols (preserves existing minus sign if present)
  str = str.replace(/[(),\$€£¥]/g, "").trim();

  // Parse to number
  const num = Number(str);

  // Return rounded number (no negative conversion for parentheses)
  return isNaN(num) ? 0 : Math.round(num);
};

// Helper function to round all financial values in an ETB row
const roundETBRowFinancialValues = (row: any): ETBRow => {
  const roundedRow = {
    ...row,
    currentYear: Math.round(Number(row.currentYear) || 0),
    priorYear: Math.round(Number(row.priorYear) || 0),
    adjustments: Math.round(Number(row.adjustments) || 0),
    reclassification: Math.round(Number(row.reclassification) || 0),
  };
  // Recalculate finalBalance from rounded values
  roundedRow.finalBalance = Math.round(
    (roundedRow.currentYear || 0) + 
    (roundedRow.adjustments || 0) + 
    (roundedRow.reclassification || 0)
  );
  return roundedRow;
};

// Helper function to round all financial values in an array of ETB rows
const roundETBRowsFinancialValues = (rows: any[]): ETBRow[] => {
  return rows.map(row => roundETBRowFinancialValues(row));
};

// Ensure each row has a unique client-only ID
// Fix the withClientIds function to ALWAYS generate unique IDs
const withClientIds = <T extends object>(rows: T[]) =>
  rows.map((r: any, i: number) => {
    // ALWAYS generate a new unique ID, even if row already has an id
    const uniqueId = `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${i}`;
    return {
      ...r,
      id: uniqueId,
      // Keep the original ID as a reference if needed
      originalId: r.id || r._id,
    };
  });

interface ETBRow {
  id: string;
  _id?: string;
  code: string;
  accountName: string;
  currentYear: number;
  priorYear: number;
  adjustments: number;
  finalBalance: number;
  classification: string;
  reclassification?: number;
  grouping1?: string;
  grouping2?: string;
  grouping3?: string;
  grouping4?: string;
  visibleLevels?: number; // Track how many classification levels are visible (1-4)
  adjustmentRefs?: string[]; // References to adjustments affecting this row
  reclassificationRefs?: string[];
  isNewAccount?: boolean; // Flag to indicate this account code didn't exist in previous year
}

interface ExtendedTrialBalanceProps {
  engagement: any;
  trialBalanceData: any;
  onClassificationChange: (classifications: string[]) => void;
  onClassificationJump?: (classification: string) => void;
  loadExistingData: any;
}

/* -------------------------------------------------------
   Classification split helpers
------------------------------------------------------- */

// Memoize these functions to prevent recalculation
const getClassificationLevels = (() => {
  const cache = new Map<string, ReturnType<typeof getClassificationLevelsInner>>();
  return (classification: string) => {
    if (!cache.has(classification)) {
      cache.set(classification, getClassificationLevelsInner(classification));
    }
    return cache.get(classification)!;
  };
})();

function getClassificationLevelsInner(classification: string) {
  const parts = (classification || "").split(" > ");
  return {
    level1: parts[0] || "",
    level2: parts[1] || "",
    level3: parts[2] || "",
    level4: parts[3] || "",
  };
}

const buildClassification = (() => {
  const cache = new Map<string, string>();
  return (l1: string, l2: string, l3: string, l4: string = "") => {
    const key = `${l1}|${l2}|${l3}|${l4}`;
    if (!cache.has(key)) {
      cache.set(key, [l1, l2, l3, l4].filter(Boolean).join(" > "));
    }
    return cache.get(key)!;
  };
})();

// Regular functions (not hooks) - will be memoized inside the component
const getUniqueLevel1 = () => [
  ...new Set(NEW_CLASSIFICATION_OPTIONS.map((opt) => opt.split(" > ")[0])),
];

const getUniqueLevel2 = (l1: string) => [
  ...new Set(
    NEW_CLASSIFICATION_OPTIONS.filter((opt) => opt.startsWith(l1))
      .map((opt) => opt.split(" > ")[1])
      .filter(Boolean)
  ),
];

const getUniqueLevel3 = (l1: string, l2: string) => [
  ...new Set(
    NEW_CLASSIFICATION_OPTIONS.filter((opt) => opt.startsWith(`${l1} > ${l2}`))
      .map((opt) => opt.split(" > ")[2])
      .filter(Boolean)
  ),
];

const getUniqueLevel4 = (l1: string, l2: string, l3: string) => [
  ...new Set(
    NEW_CLASSIFICATION_OPTIONS.filter((opt) => opt.startsWith(`${l1} > ${l2} > ${l3}`))
      .map((opt) => opt.split(" > ")[3])
      .filter(Boolean)
  ),
];

const formatClassificationForDisplay = (classification: string) => {
  if (!classification) return "—";
  const parts = classification.split(" > ");
  return parts.length >= 3 ? parts[2] : parts[parts.length - 1];
};

const hasNonZeroAdjustments = (rows: ETBRow[]) =>
  rows.some((r) => Number(r.adjustments) !== 0);

const hasNonZeroReclassifications = (rows: ETBRow[]) =>
  rows.some((r) => Number(r.reclassification) !== 0);

/* -------------------------------------------------------
   Searchable Combobox (shadcn style)
------------------------------------------------------- */

type ComboOption = { value: string; label?: string };

// Create a stable component that doesn't recreate its internal state
const SearchableSelect = React.memo(function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  emptyText = "No results.",
  disabled,
  widthClass = "w-32 sm:w-40",
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[] | ComboOption[];
  placeholder?: string;
  className?: string;
  emptyText?: string;
  disabled?: boolean;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);

  // Memoize the normalized options to prevent recreating them on every render
  const normalized = useMemo<ComboOption[]>(
    () =>
      (options as any[]).map((o) =>
        typeof o === "string"
          ? { value: o, label: o }
          : ({ value: o.value, label: o.label ?? o.value } as ComboOption)
      ),
    [options]
  );

  // Memoize the selected label to prevent recalculating on every render
  const selectedLabel = useMemo(() =>
    normalized.find((o) => o.value === value)?.label,
    [normalized, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between text-xs sm:text-sm",
            widthClass,
            className
          )}
          disabled={disabled}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {selectedLabel || placeholder || "Select"}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", widthClass)}>
        <Command
          filter={(val, search) =>
            val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={placeholder || "Search..."} />
          <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
            {emptyText}
          </CommandEmpty>
          <CommandGroup className="max-h-24 w-auto overflow-auto">
            {normalized.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.label || opt.value}
                onSelect={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === opt.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{opt.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

/* -------------------------------------------------------
   Auth fetch helper (Supabase token)
------------------------------------------------------- */

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const headers = new Headers(options.headers || {});
  if (data.session?.access_token)
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(url, { ...options, headers });
}

/* -------------------------------------------------------
   ClassificationCombos Component (moved outside)
------------------------------------------------------- */

// Create a separate component for classification combos with proper key to prevent re-renders
// Define it outside the main component to avoid hook issues
const ClassificationCombos = React.memo(({
  rowId,
  classification,
  onChange,
  memoizedLevel1Options,
  visibleLevels = 4,
  onVisibleLevelsChange
}: {
  rowId: string;
  classification: string;
  onChange: (rowId: string, classification: string) => void;
  memoizedLevel1Options: string[];
  visibleLevels?: number;
  onVisibleLevelsChange?: (rowId: string, levels: number) => void;
}) => {
  // Use a ref to store the internal state to prevent re-initialization
  const stateRef = useRef<{
    level1: string;
    level2: string;
    level3: string;
    level4: string;
  }>({
    level1: "",
    level2: "",
    level3: "",
    level4: "",
  });

  // Initialize state from classification on first render or when it changes
  const [internalState, setInternalState] = useState(() => {
    const levels = getClassificationLevels(classification);
    stateRef.current = levels;
    return levels;
  });

  // Update internal state when classification prop changes
  useEffect(() => {
    const levels = getClassificationLevels(classification);
    // Only update if the classification actually changed
    if (levels.level1 !== stateRef.current.level1 ||
      levels.level2 !== stateRef.current.level2 ||
      levels.level3 !== stateRef.current.level3 ||
      levels.level4 !== stateRef.current.level4) {
      stateRef.current = levels;
      setInternalState(levels);
    }
  }, [classification]);

  // Memoize the options to prevent recreating them on every render
  const level2Options = useMemo(
    () => (internalState.level1 ? getUniqueLevel2(internalState.level1) : []),
    [internalState.level1]
  );
  const level3Options = useMemo(
    () => (internalState.level1 && internalState.level2 ? getUniqueLevel3(internalState.level1, internalState.level2) : []),
    [internalState.level1, internalState.level2]
  );
  const level4Options = useMemo(
    () => (internalState.level1 && internalState.level2 && internalState.level3 ? getUniqueLevel4(internalState.level1, internalState.level2, internalState.level3) : []),
    [internalState.level1, internalState.level2, internalState.level3]
  );

  // Memoize the event handlers to prevent recreating them on every render
  const handleL1Change = useCallback((v: string) => {
    const newState = { level1: v, level2: "", level3: "", level4: "" };
    stateRef.current = newState;
    setInternalState(newState);
    onChange(rowId, buildClassification(v, "", ""));
  }, [rowId, onChange]);

  const handleL2Change = useCallback((v: string) => {
    const newState = { ...stateRef.current, level2: v, level3: "", level4: "" };
    stateRef.current = newState;
    setInternalState(newState);
    onChange(rowId, buildClassification(newState.level1, v, ""));
  }, [rowId, onChange]);

  const handleL3Change = useCallback((v: string) => {
    const newState = { ...stateRef.current, level3: v, level4: "" };
    stateRef.current = newState;
    setInternalState(newState);
    onChange(rowId, buildClassification(newState.level1, newState.level2, v));
  }, [rowId, onChange]);

  const handleL4Change = useCallback((v: string) => {
    const newState = { ...stateRef.current, level4: v };
    stateRef.current = newState;
    setInternalState(newState);
    onChange(rowId, buildClassification(newState.level1, newState.level2, newState.level3, v));
  }, [rowId, onChange]);

  // Handle removing a level
  const handleRemoveLevel = useCallback((level: number) => {
    if (!onVisibleLevelsChange) return;

    if (level === 1) {
      // Removing level 1 clears all
      const newState = { level1: "", level2: "", level3: "", level4: "" };
      stateRef.current = newState;
      setInternalState(newState);
      onChange(rowId, "");
      onVisibleLevelsChange(rowId, 0);
    } else if (level === 2) {
      // Removing level 2 clears level 2, 3, 4
      const newState = { ...stateRef.current, level2: "", level3: "", level4: "" };
      stateRef.current = newState;
      setInternalState(newState);
      onChange(rowId, buildClassification(newState.level1, "", ""));
      onVisibleLevelsChange(rowId, 1);
    } else if (level === 3) {
      // Removing level 3 clears level 3, 4
      const newState = { ...stateRef.current, level3: "", level4: "" };
      stateRef.current = newState;
      setInternalState(newState);
      onChange(rowId, buildClassification(newState.level1, newState.level2, ""));
      onVisibleLevelsChange(rowId, 2);
    } else if (level === 4) {
      // Removing level 4 only
      const newState = { ...stateRef.current, level4: "" };
      stateRef.current = newState;
      setInternalState(newState);
      onChange(rowId, buildClassification(newState.level1, newState.level2, newState.level3));
      onVisibleLevelsChange(rowId, 3);
    }
  }, [rowId, onChange, onVisibleLevelsChange]);

  // Handle adding a level
  const handleAddLevel = useCallback(() => {
    if (!onVisibleLevelsChange) return;
    onVisibleLevelsChange(rowId, Math.min((visibleLevels || 0) + 1, 4));
  }, [rowId, onVisibleLevelsChange, visibleLevels]);

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
      {visibleLevels >= 1 && (
        <div className="flex items-center gap-1">
          <SearchableSelect
            value={internalState.level1}
            onChange={handleL1Change}
            options={memoizedLevel1Options}
            placeholder="Level 1"
            className="max-h-44 overflow-y-auto"
            widthClass="w-fit"
          />
          {onVisibleLevelsChange && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleRemoveLevel(1)}
              title="Remove Level 1"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      {visibleLevels >= 2 && (
        <div className="flex items-center gap-1">
          <SearchableSelect
            value={internalState.level2}
            className="max-h-44 overflow-y-auto"
            onChange={handleL2Change}
            options={level2Options}
            placeholder="Level 2"
            widthClass="w-fit"
            disabled={level2Options.length === 0}
          />
          {onVisibleLevelsChange && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleRemoveLevel(2)}
              title="Remove Level 2"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      {visibleLevels >= 3 && (
        <div className="flex items-center gap-1">
          <SearchableSelect
            value={internalState.level3}
            onChange={handleL3Change}
            options={level3Options}
            placeholder="Level 3"
            className="max-h-44 overflow-y-auto"
            widthClass="w-fit"
            disabled={level3Options.length === 0}
          />
          {onVisibleLevelsChange && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleRemoveLevel(3)}
              title="Remove Level 3"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      {visibleLevels >= 4 && (
        <div className="flex items-center gap-1">
          <SearchableSelect
            value={internalState.level4}
            onChange={handleL4Change}
            options={level4Options}
            placeholder="Level 4"
            className="max-h-44 overflow-y-auto"
            widthClass="w-fit"
            disabled={level4Options.length === 0}
          />
          {onVisibleLevelsChange && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleRemoveLevel(4)}
              title="Remove Level 4"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      {onVisibleLevelsChange && visibleLevels < 4 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleAddLevel}
          title="Add Level"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Level
        </Button>
      )}
    </div>
  );
});

/* -------------------------------------------------------
   Component
------------------------------------------------------- */

export const ExtendedTrialBalance: React.FC<ExtendedTrialBalanceProps> = ({
  engagement,
  trialBalanceData,
  onClassificationChange,
  loadExistingData,
  onClassificationJump,
}) => {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL, BEFORE ANY CONDITIONALS

  const [isPushingToCloud, setIsPushingToCloud] = useState(false);
  const [etbRows, setEtbRows] = useState<ETBRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushingToCloud, setPushingToCloud] = useState(false);
  const [excelUrl, setExcelUrl] = useState<string>("");
  const [hasBeenPushed, setHasBeenPushed] = useState<boolean>(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);

  // CRITICAL: Add a global flag to track if we're in a push operation
  const [isPushingToCloudGlobal, setIsPushingToCloudGlobal] = useState(false);

  // State for row selection and bulk classification editing
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkClassification, setBulkClassification] = useState<string>("");
  const [bulkVisibleLevels, setBulkVisibleLevels] = useState<number>(4);

  // State for adjustment details dialog
  const [showAdjustmentDetails, setShowAdjustmentDetails] = useState(false);
  const [selectedRowForAdjustments, setSelectedRowForAdjustments] = useState<ETBRow | null>(null);
  const [adjustmentsForRow, setAdjustmentsForRow] = useState<any[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);

  // State for reclassification details dialog
  const [showReclassificationDetails, setShowReclassificationDetails] = useState(false);
  const [selectedRowForReclassifications, setSelectedRowForReclassifications] = useState<ETBRow | null>(null);
  const [reclassificationsForRow, setReclassificationsForRow] = useState<any[]>([]);
  const [loadingReclassifications, setLoadingReclassifications] = useState(false);

  // State for prior year population
  const [isPopulatingPriorYear, setIsPopulatingPriorYear] = useState(false);

  // State for delete row warning dialog
  const [showDeleteRowWarning, setShowDeleteRowWarning] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<ETBRow | null>(null);
  const [adjustmentsForDeleteRow, setAdjustmentsForDeleteRow] = useState<any[]>([]);
  const [reclassificationsForDeleteRow, setReclassificationsForDeleteRow] = useState<any[]>([]);
  const [loadingDeleteRowData, setLoadingDeleteRowData] = useState(false);
  const [deletingAdjustments, setDeletingAdjustments] = useState<Set<string>>(new Set());
  const [deletingReclassifications, setDeletingReclassifications] = useState<Set<string>>(new Set());

  const isPushingRef = useRef(false);
  const isPushingToCloudRef = useRef(false);
  const pushingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pushingToCloudIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Memoize the classification options inside the component
  const memoizedLevel1Options = useMemo(() => getUniqueLevel1(), []);

  // stable key per engagement to persist the workbook URL across remounts/prop hiccups
  const storageKey = useMemo(
    () => `etb_excel_url_${engagement?._id || "unknown"}`,
    [engagement?._id]
  );

  // key for tracking whether data has been pushed
  const pushedKey = useMemo(
    () => `etb_excel_pushed_${engagement?._id || "unknown"}`,
    [engagement?._id]
  );

  // Memoize the updateRow function to prevent recreating it on every render
  const updateRow = useCallback((id: string, field: keyof ETBRow, value: any) => {
    setEtbRows(prevRows => {
      const newRows = prevRows.map((row) => {
        if (row.id !== id) return row;
        // Convert to number and round if the field is numeric
        const numericValue = (field === "currentYear" || field === "priorYear" ||
          field === "adjustments" || field === "reclassification" || field === "finalBalance")
          ? Math.round(Number(value) || 0)
          : value;
        const updatedRow = { ...row, [field]: numericValue };
        if (field === "adjustments" || field === "currentYear" || field === "reclassification") {
          // Calculate finalBalance from rounded values
          updatedRow.finalBalance = Math.round(
            Number(updatedRow.currentYear) + Number(updatedRow.adjustments) + Number(updatedRow.reclassification || 0)
          );
        }
        return updatedRow;
      });
      return newRows;
    });
  }, []);

  // Memoize refreshClassificationSummary
  const refreshClassificationSummary = useCallback((rows: ETBRow[]) => {
    const unique = new Set(rows.map((r) => r.classification).filter(Boolean));
    if (hasNonZeroAdjustments(rows)) unique.add("Adjustments");
    if (hasNonZeroReclassifications(rows)) unique.add("Reclassifications");
    onClassificationChange([...unique]);
  }, [onClassificationChange]);

  // rehydrate from localStorage on mount/remount
  useEffect(() => {
    if (!excelUrl) {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) setExcelUrl(cached);
      } catch { }
    }
    // Restore hasBeenPushed state from localStorage
    try {
      const pushedState = localStorage.getItem(pushedKey);
      if (pushedState === "true") setHasBeenPushed(true);
    } catch { }
  }, [storageKey, pushedKey, excelUrl]);

  // seed local url from props only if empty, and persist it
  useEffect(() => {
    if (!excelUrl && engagement?.excelURL) {
      setExcelUrl(engagement.excelURL);
      try {
        localStorage.setItem(storageKey, engagement.excelURL);
      } catch { }
    }
  }, [engagement?.excelURL, excelUrl, storageKey]);

  // effective url drives the UI (prevents flicker if props go undefined temporarily)
  const effectiveExcelUrl = excelUrl || engagement?.excelURL || "";
  const hasWorkbook = !!effectiveExcelUrl;

  // Check localStorage directly to ensure button visibility persists
  // Include forceUpdate to recalculate when we force a re-render
  const checkHasBeenPushed = useMemo(() => {
    try {
      return localStorage.getItem(pushedKey) === "true";
    } catch {
      return hasBeenPushed;
    }
  }, [hasBeenPushed, pushedKey, forceUpdate]);

  // Direct check for button visibility - reads localStorage on every render
  // This ensures button appears even if state hasn't updated yet
  const shouldShowFetchButton = (() => {
    try {
      return localStorage.getItem(pushedKey) === "true" || hasBeenPushed;
    } catch {
      return hasBeenPushed || checkHasBeenPushed;
    }
  })();

  // Sync state with localStorage to ensure button visibility
  // This runs whenever forceUpdate changes or when component needs to sync
  useEffect(() => {
    try {
      const pushedState = localStorage.getItem(pushedKey);
      if (pushedState === "true" && !hasBeenPushed) {
        setHasBeenPushed(true);
        setForceUpdate((prev) => prev + 1); // Trigger re-render
      }
    } catch { }
  }, [hasBeenPushed, pushedKey, forceUpdate]);

  // Critical: Restore state when engagement prop changes (happens after loadExistingData)
  // This prevents hasBeenPushed from being lost during re-renders caused by saveETB
  useEffect(() => {
    // If we've pushed before (tracked in localStorage), restore the state
    // This runs whenever engagement object reference changes (which happens after loadExistingData updates props)
    try {
      const pushedState = localStorage.getItem(pushedKey);
      if (pushedState === "true") {
        setHasBeenPushed((prev) => {
          if (!prev) {
            setForceUpdate((f) => f + 1);
            return true;
          }
          return prev;
        });
      }
    } catch { }
  }, [engagement]); // Re-check when engagement changes (happens after loadExistingData updates props)

  // Additional effect to watch for localStorage changes (in case of re-renders from loadExistingData)
  // This is critical to restore state after re-renders caused by saveETB/loadExistingData
  useEffect(() => {
    try {
      const pushedState = localStorage.getItem(pushedKey);
      if (pushedState === "true" && !hasBeenPushed) {
        setHasBeenPushed(true);
      }
    } catch {
      // ignore
    }
  }, [pushedKey]);


  // Poll localStorage periodically to catch changes immediately
  useEffect(() => {
    const intervalId = setInterval(() => {
      try {
        const pushedState = localStorage.getItem(pushedKey);
        if (pushedState === "true" && !hasBeenPushed) {
          setHasBeenPushed(true);
          setForceUpdate((prev) => prev + 1);
        }
      } catch { }
    }, 100); // Check every 100ms

    return () => clearInterval(intervalId);
  }, [hasBeenPushed, pushedKey]);

  // Simple protection: If ref indicates we're pushing but state was reset, restore it
  // The interval in pushToCloud handles most cases, but this catches edge cases
  useEffect(() => {
    if (isPushingRef.current && !pushing) {
      setPushing(true);
    }
  }, [pushing]); // Watch pushing state - restore if ref is true but state is false

  // CRITICAL: Protect pushingToCloud state from being reset by re-renders (e.g., when loadExistingData triggers re-render)
  // This ensures loader stays visible even if re-renders caused by saveETB/loadExistingData reset the state
  useEffect(() => {
    if (isPushingToCloudRef.current && !pushingToCloud) {
      setPushingToCloud(true);
    }
  }, [pushingToCloud]); // Watch pushingToCloud state - restore if ref is true but state is false

  // Track if we've initialized for this trial balance data
  const tbDataRef = useRef<any>(null);

  const autoClassify = useCallback((accountName: string): string => {
    const name = (accountName || "").toLowerCase();
    for (const rule of NEW_CLASSIFICATION_RULESET) {
      if (rule.keywords.some((keyword) => name.includes(keyword)))
        return rule.classification;
    }
    return "";
  }, []);

  const initializeETB = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session?.access_token) throw new Error("Not authenticated");

      const etbResponse = await fetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
        }
      );

      if (etbResponse.ok) {
        const existingETB = await etbResponse.json();

        if (existingETB.rows && existingETB.rows.length > 0) {
          const rowsWithIds = withClientIds(existingETB.rows).map((row: ETBRow) => {
            // Round all financial values first
            const roundedRow = roundETBRowFinancialValues(row);
            // Calculate visibleLevels if not present
            // Show at least 1 level by default for rows without classification
            if (roundedRow.visibleLevels === undefined || roundedRow.visibleLevels === null) {
              const parts = (roundedRow.classification || "").split(" > ").filter(Boolean);
              return { ...roundedRow, visibleLevels: parts.length > 0 ? parts.length : 1 };
            }
            return roundedRow;
          });

          // DEBUG: Log new accounts detection
          const newAccounts = rowsWithIds.filter((row: ETBRow) => row.isNewAccount === true);
          console.log('[ETB] Total rows loaded:', rowsWithIds.length);
          console.log('[ETB] New accounts detected:', newAccounts.length);
          if (newAccounts.length > 0) {
            console.log('[ETB] New account codes:', newAccounts.map((r: ETBRow) => r.code));
          }

          setEtbRows(rowsWithIds);
          refreshClassificationSummary(rowsWithIds);
          // only seed from props if we don't already have one (effect above also handles this)
          if (!excelUrl && engagement?.excelURL) {
            setExcelUrl(engagement.excelURL);
            try {
              localStorage.setItem(storageKey, engagement.excelURL);
            } catch { }
          }
          setLoading(false);
          return;
        }
      }

      if (!trialBalanceData?.data) return;

      const [headers, ...rows] = trialBalanceData.data;

      const codeIndex = headers.findIndex((h: string) =>
        h.toLowerCase().includes("code")
      );
      const nameIndex = headers.findIndex((h: string) =>
        h.toLowerCase().includes("account name")
      );
      const currentYearIndex = headers.findIndex((h: string) =>
        h.toLowerCase().includes("current year")
      );
      const priorYearIndex = headers.findIndex((h: string) =>
        h.toLowerCase().includes("prior year")
      );

      // Find optional grouping column indices
      const grouping1Index = headers.findIndex((h: string) =>
        h.toLowerCase().trim() === "grouping 1"
      );
      const grouping2Index = headers.findIndex((h: string) =>
        h.toLowerCase().trim() === "grouping 2"
      );
      const grouping3Index = headers.findIndex((h: string) =>
        h.toLowerCase().trim() === "grouping 3"
      );
      const grouping4Index = headers.findIndex((h: string) =>
        h.toLowerCase().trim() === "grouping 4"
      );

      const etbData: ETBRow[] = rows
        .map((row: any[], index: number) => {
          const code = row[codeIndex] || "";
          const accountName = row[nameIndex] || "";

          // Parse numeric values - remove parentheses and commas: (55,662) → 55662
          const currentYear = parseAccountingNumber(row[currentYearIndex]);
          const priorYear = parseAccountingNumber(row[priorYearIndex]);
          const adjustments = 0;

          // Extract grouping values from file if available
          const g1 = grouping1Index !== -1 ? (row[grouping1Index] || "").trim() : "";
          const g2 = grouping2Index !== -1 ? (row[grouping2Index] || "").trim() : "";
          const g3 = grouping3Index !== -1 ? (row[grouping3Index] || "").trim() : "";
          const g4 = grouping4Index !== -1 ? (row[grouping4Index] || "").trim() : "";

          // Determine classification:
          // - If file has grouping values, build classification from them (no autoClassify)
          // - If no grouping values, use autoClassify
          const hasFileGrouping = g1 || g2 || g3 || g4;
          let classification = "";

          if (hasFileGrouping) {
            // Build classification from file grouping values
            classification = [g1, g2, g3, g4].filter(Boolean).join(" > ");
          } else {
            // No grouping in file, use autoClassify
            // classification = autoClassify(accountName);
            classification = "";
          }

          // Calculate initial visible levels based on classification
          // If classification exists, show those levels; otherwise show 1 level by default
          const parts = (classification || "").split(" > ").filter(Boolean);
          const initialVisibleLevels = parts.length > 0 ? parts.length : 1;

          const initialReclassification = 0;
          // Round all financial values and calculate finalBalance from rounded values
          const roundedCurrentYear = Math.round(currentYear);
          const roundedPriorYear = Math.round(priorYear);
          const roundedAdjustments = Math.round(adjustments);
          const roundedReclassification = Math.round(initialReclassification);
          const roundedFinalBalance = Math.round(roundedCurrentYear + roundedAdjustments + roundedReclassification);
          
          return {
            id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${index}`,
            code,
            accountName,
            currentYear: roundedCurrentYear,
            priorYear: roundedPriorYear,
            adjustments: roundedAdjustments,
            reclassification: roundedReclassification,
            finalBalance: roundedFinalBalance,
            classification,
            // Store file grouping (will be overwritten when user changes classification)
            grouping1: g1,
            grouping2: g2,
            grouping3: g3,
            grouping4: g4,
            visibleLevels: initialVisibleLevels,
          };
        })
        // Keep row if at least ONE of these has a value (Code OR Account Name OR Current Year)
        // Filter out ONLY if ALL THREE are empty/zero
        .filter((row) => {
          const codeStr = (row.code || "").toString().trim();
          const accountNameStr = (row.accountName || "").toString().trim();
          return codeStr !== "" || accountNameStr !== "" || row.currentYear !== 0;
        });

      setEtbRows(etbData);
      refreshClassificationSummary(etbData);

      // Auto-save the newly initialized ETB data to database (only if rows exist)
      // IMPORTANT: Check if backend ETB already exists first to avoid overwriting
      const checkResponse = await fetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
        }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.rows && checkData.rows.length > 0) {
          // Don't save - backend ETB takes precedence
          // Instead, refetch from backend to get the correct data
          const refetchResponse = await fetch(
            `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.session.access_token}`,
              },
            }
          );
          if (refetchResponse.ok) {
            const refetchedETB = await refetchResponse.json();
            if (refetchedETB.rows && refetchedETB.rows.length > 0) {
              const rowsWithIds = withClientIds(refetchedETB.rows).map((row: ETBRow) => {
                // Round all financial values first
                const roundedRow = roundETBRowFinancialValues(row);
                if (roundedRow.visibleLevels === undefined || roundedRow.visibleLevels === null) {
                  const parts = (roundedRow.classification || "").split(" > ").filter(Boolean);
                  return { ...roundedRow, visibleLevels: parts.length > 0 ? parts.length : 1 };
                }
                return roundedRow;
              });
              setEtbRows(rowsWithIds);
              refreshClassificationSummary(rowsWithIds);
            }
          }
          return;
        }
      }

      // Backend ETB doesn't exist - safe to save
      if (etbData && etbData.length > 0) {
        await saveETB(false, etbData);
      }
    } catch (error) {
      console.error("Failed to initialize ETB:", error);
    } finally {
      setLoading(false);
    }
  }, [engagement._id, excelUrl, engagement?.excelURL, storageKey, trialBalanceData, autoClassify, refreshClassificationSummary]);

  // init rows when trialBalanceData changes OR when component mounts
  // This MUST be after initializeETB is defined
  useEffect(() => {
    // Always initialize if we don't have rows yet
    if (trialBalanceData && etbRows.length === 0) {
      tbDataRef.current = trialBalanceData;
      initializeETB();
      return;
    }

    // Re-initialize if trialBalanceData has changed (new upload)
    if (trialBalanceData && tbDataRef.current !== trialBalanceData) {
      tbDataRef.current = trialBalanceData;
      initializeETB();
    }
  }, [trialBalanceData, etbRows.length, initializeETB]);

  const addNewRow = useCallback(() => {
    const newRow: ETBRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${etbRows.length}`,
      code: "",
      accountName: "",
      currentYear: 0,
      priorYear: 0,
      adjustments: 0,
      reclassification: 0,
      finalBalance: 0,
      classification: "",
      grouping1: "",
      grouping2: "",
      grouping3: "",
      grouping4: "",
      visibleLevels: 1,
    };
    setEtbRows(prevRows => {
      const newRows = [...prevRows, newRow];
      refreshClassificationSummary(newRows);
      return newRows;
    });
  }, [refreshClassificationSummary, etbRows.length]);

  // Save ETB (optionally mute toast, optionally pass custom rows)
  const saveETB = useCallback(async (showToast = true, customRows?: ETBRow[], skipLoadExistingData = false) => {
    const rowsToSave = customRows || etbRows;

    // Round all financial values before saving to backend
    const roundedRows = roundETBRowsFinancialValues(rowsToSave);

    // Only set saving state if we're not in the middle of a push operation
    if (!isPushingToCloud) {
      setSaving(true);
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ rows: roundedRows }),
        }
      );

      if (!response.ok)
        throw new Error("Failed to save Extended Trial Balance");

      refreshClassificationSummary(roundedRows);
      if (showToast)
        toast({
          title: "Success",
          description: "Extended Trial Balance saved successfully",
        });
    } catch (error: any) {
      console.error("Save error:", error);
      if (showToast) {
        toast({
          title: "Save failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      // Only reset saving state if we're not in the middle of a push operation
      if (!isPushingToCloud) {
        setSaving(false);
        // Only call loadExistingData if we're not in a push operation and not explicitly skipping it
        if (!skipLoadExistingData) {
          loadExistingData();
        }
      }
    }
  }, [etbRows, isPushingToCloud, refreshClassificationSummary, engagement._id, toast, loadExistingData]);

  // Actually delete the row after all checks
  const proceedWithRowDeletion = useCallback((id: string) => {
    // Calculate new rows first
    const newRows = etbRows.filter((row) => row.id !== id);

    // Update state immediately for UI responsiveness
    setEtbRows(newRows);
    refreshClassificationSummary(newRows);

    // Save the updated ETB with the filtered rows, skip reloading existing data to avoid restoring deleted row
    saveETB(true, newRows, true); // skipLoadExistingData = true
  }, [etbRows, refreshClassificationSummary, saveETB]);

  // Check for adjustments and reclassifications before deleting a row
  const checkRowBeforeDelete = useCallback(async (row: ETBRow) => {
    setRowToDelete(row);
    setLoadingDeleteRowData(true);
    setAdjustmentsForDeleteRow([]);
    setReclassificationsForDeleteRow([]);

    try {
      const rowId = row._id || row.id || row.code;

      // Fetch all adjustments and reclassifications for this engagement
      const [adjustmentsResponse, reclassificationsResponse] = await Promise.all([
        adjustmentApi.getByEngagement(engagement._id),
        reclassificationApi.getByEngagement(engagement._id),
      ]);

      // Filter to find adjustments/reclassifications affecting this row
      const relevantAdjustments = adjustmentsResponse.success
        ? adjustmentsResponse.data.filter((adj: any) =>
          adj.entries.some((entry: any) =>
            entry.etbRowId === rowId || entry.code === row.code
          )
        )
        : [];

      const relevantReclassifications = reclassificationsResponse.success
        ? reclassificationsResponse.data.filter((rc: any) =>
          rc.entries.some((entry: any) =>
            entry.etbRowId === rowId || entry.code === row.code
          )
        )
        : [];

      setAdjustmentsForDeleteRow(relevantAdjustments);
      setReclassificationsForDeleteRow(relevantReclassifications);

      // If there are adjustments or reclassifications, show warning dialog
      if (relevantAdjustments.length > 0 || relevantReclassifications.length > 0) {
        setShowDeleteRowWarning(true);
      } else {
        // No adjustments/reclassifications, proceed with deletion
        proceedWithRowDeletion(row.id);
      }
    } catch (error: any) {
      console.error("Error checking row before delete:", error);
      toast({
        title: "Error",
        description: "Failed to check for adjustments/reclassifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingDeleteRowData(false);
    }
  }, [engagement._id, toast, proceedWithRowDeletion]);

  const deleteRow = useCallback((id: string) => {
    const row = etbRows.find((r) => r.id === id);
    if (!row) return;

    // Check for adjustments/reclassifications before deleting
    checkRowBeforeDelete(row);
  }, [etbRows, checkRowBeforeDelete]);

  /* ---------------------------------------------
   Helper function for the core push logic
--------------------------------------------- */

  const performPushToCloud = useCallback(async () => {
    // 1. Save the current ETB data to the database first.
    // We pass `true` to skip calling `loadExistingData` to prevent re-renders during the operation.
    await saveETB(false, undefined, true);

    // 2. Make the API call to push the data to the Excel workbook.
    const res = await authFetch(
      `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb/excel/push`,
      {
        method: "POST",
      }
    );

    if (!res.ok) throw new Error("Failed to push ETB to Excel.");

    const json = await res.json();
    if (json?.url) {
      setExcelUrl(json.url);
      try {
        localStorage.setItem(storageKey, json.url);
      } catch { }
    }
  }, [saveETB, engagement._id, storageKey]);

  /* ---------------------------------------------
     Excel Cloud actions (init/open, push, pull)
  --------------------------------------------- */

  const initializeExcelWorkbook = useCallback(async (autoPush = false) => {
    setLoading(true);
    try {
      const res = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb/excel/init`,
        {
          method: "POST",
        }
      );
      if (!res.ok) throw new Error("Failed to initialize Excel workbook.");
      const json = await res.json();
      if (!json?.url) throw new Error("Server did not return an Excel URL.");

      setExcelUrl(json.url);
      setHasBeenPushed(false); // Reset push state for new workbook
      try {
        localStorage.setItem(storageKey, json.url);
        localStorage.setItem(pushedKey, "false");
      } catch { }

      // --- NEW AUTO-PUSH LOGIC ---
      if (autoPush) {
        try {
          await performPushToCloud(); // Call the helper function

          // If push is successful, update state and show a combined success message
          localStorage.setItem(pushedKey, "true");
          setHasBeenPushed(true);
          toast({
            title: "Success",
            description: "Workbook created and data pushed to Excel Online.",
          });
        } catch (pushError: any) {
          console.error("Auto-push failed:", pushError);
          // If push fails, inform the user that the workbook was created but they need to push manually
          toast({
            title: "Partial Success",
            description: "Workbook created, but failed to push data. You can try pushing manually.",
            variant: "destructive",
          });
        }
      } else {
        // Original toast for when auto-push is not enabled
        toast({
          title: "Excel initialized",
          description: "Workbook created. You can now push your data.",
        });
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Excel init error",
        description: e.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [engagement._id, performPushToCloud, storageKey, pushedKey, toast]);

  const openInExcel = useCallback(() => {
    if (!effectiveExcelUrl) {
      toast({
        title: "Workbook not initialized",
        description: "Click \"Initialize Excel\" first.",
        variant: "destructive",
      });
      return;
    }

    const popup = window.open("", "_blank");
    if (popup) {
      popup.document.write(`
        <html>
          <head>
            <title>Opening Excel...</title>
            <style>
              body { display:flex; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background:#f9fafb; color:#111; }
              .spinner { border:4px solid #ddd; border-top:4px solid #4f46e5; border-radius:50%; width:40px; height:40px; animation: spin 1s linear infinite; margin-right:12px; }
              @keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <div>Opening your Excel workbook...</div>
          </body>
        </html>
      `);
      // navigate using the effective URL (prevents undefined flicker)
      popup.location.href = effectiveExcelUrl;
    }
    toast({
      title: "Excel Online",
      description: "Workbook opened in a new tab.",
    });
  }, [effectiveExcelUrl, toast]);

  // Helper function to clear all intervals and refs
  const clearAllIntervalsAndRefs = useCallback(() => {
    if (pushingIntervalRef.current) {
      clearInterval(pushingIntervalRef.current);
      pushingIntervalRef.current = null;
    }
    if (pushingToCloudIntervalRef.current) {
      clearInterval(pushingToCloudIntervalRef.current);
      pushingToCloudIntervalRef.current = null;
    }
    isPushingRef.current = false;
    isPushingToCloudRef.current = false;
  }, []);

  // Simplified loading state
  const isLoading = loading || isPushingToCloud || saving;

  const pushToCloud = useCallback(async () => {
    setIsPushingToCloud(true);
    try {
      await performPushToCloud(); // Use the shared helper

      // Update state and show success message
      localStorage.setItem(pushedKey, "true");
      setHasBeenPushed(true);
      toast({ title: "Pushed", description: "ETB uploaded to Excel Online." });

    } catch (e: any) {
      console.error("Push to cloud error:", e);
      toast({
        title: "Push failed",
        description: e.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPushingToCloud(false);
      // Load existing data after the operation is complete
      setTimeout(() => loadExistingData(), 100);
    }
  }, [performPushToCloud, pushedKey, toast, loadExistingData]);

  const pullFromCloud = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id
        }/etb/excel/pull`,
        {
          method: "POST",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch data from Excel Online.");
      const etb = await res.json();
      const withIds = (etb.rows || []).map((r: any, i: number) => {
        const row = {
          id: r.id || `row-${i}-${Date.now()}`,
          ...r,
        };
        // Calculate visibleLevels if not present
        // Show at least 1 level by default for rows without classification
        if (row.visibleLevels === undefined || row.visibleLevels === null) {
          const parts = (row.classification || "").split(" > ").filter(Boolean);
          row.visibleLevels = parts.length > 0 ? parts.length : 1;
        }
        // Round all financial values before using the row
        return roundETBRowFinancialValues(row);
      });
      setEtbRows(withIds);
      refreshClassificationSummary(withIds);
      toast({
        title: "Fetched",
        description: "Latest data pulled from Excel into ETB.",
      });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Fetch failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [engagement._id, refreshClassificationSummary, toast]);

  /* ---------------------------------------------
     Totals & UI
  --------------------------------------------- */

  const totals = useMemo(
    () =>
      etbRows.reduce(
        (acc, row) => ({
          currentYear: acc.currentYear + (Number(row.currentYear) || 0),
          priorYear: acc.priorYear + (Number(row.priorYear) || 0),
          adjustments: acc.adjustments + (Number(row.adjustments) || 0),
          reclassification: acc.reclassification + (Number(row.reclassification) || 0),
          finalBalance: acc.finalBalance + (Number(row.finalBalance) || 0),
        }),
        { currentYear: 0, priorYear: 0, adjustments: 0, reclassification: 0, finalBalance: 0 }
      ),
    [etbRows]
  );

  const unclassifiedRows = useMemo(() =>
    etbRows.filter((row) => !row.classification),
    [etbRows]
  );

  // Calculate new accounts count
  const newAccountsCount = useMemo(() =>
    etbRows.filter((row) => row.isNewAccount === true).length,
    [etbRows]
  );

  // CRITICAL: Derive actual pushing state from both state and ref
  // If ref says we're pushing, always show loader (even if state was reset)
  const actualPushing = pushing || isPushingRef.current;

  // CRITICAL: Derive actual pushingToCloud state from both state and ref
  // If ref says we're pushing, always show loader (even if state was reset)
  const actualPushingToCloud = pushingToCloud || isPushingToCloudRef.current;

  // Memoize the classification change handler
  // When classification changes, sync grouping fields from classification parts
  // This ensures grouping and classification stay in sync for Excel export
  const handleClassificationChange = useCallback((rowId: string, classification: string) => {
    setEtbRows(prevRows => {
      return prevRows.map((row) => {
        if (row.id !== rowId) return row;

        // Extract classification parts to sync with grouping fields
        const parts = (classification || "").split(" > ").map(s => s.trim());

        // Update BOTH classification AND grouping fields to keep them in sync
        // Backend will use grouping fields with classification as fallback
        const updatedRow = {
          ...row,
          classification,
          // Sync grouping to match classification parts
          grouping1: parts[0] || "",
          grouping2: parts[1] || "",
          grouping3: parts[2] || "",
          grouping4: parts[3] || "",
        };

        return updatedRow;
      });
    });
  }, []);

  // Toggle individual row selection
  // 2. Update the toggleRowSelection function to ensure it's working correctly
  const toggleRowSelection = useCallback((rowId: string) => {
    console.log('Toggling row with ID:', rowId);
    console.log('Current selection:', Array.from(selectedRowIds));

    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
        console.log('Deselected row:', rowId);
      } else {
        newSet.add(rowId);
        console.log('Selected row:', rowId);
      }
      console.log('New selection:', Array.from(newSet));
      return newSet;
    });
  }, [selectedRowIds]);

  // Toggle all rows selection
  const toggleAllRows = useCallback(() => {
    setSelectedRowIds(prev => {
      const filteredRows = etbRows.filter((row) => {
        const code = (row.code || "").toString().trim().toUpperCase();
        return !code.startsWith("TOTALS");
      });

      if (prev.size === filteredRows.length) {
        return new Set();
      } else {
        return new Set(filteredRows.map(row => row.id));
      }
    });
  }, [etbRows]);

  // Apply bulk classification to selected rows
  const applyBulkClassification = useCallback((classification: string) => {
    setBulkClassification(classification);

    // Extract classification parts to sync with grouping fields
    const parts = (classification || "").split(" > ").filter(Boolean).map(s => s.trim());

    // Calculate visible levels based on classification depth
    const newVisibleLevels = parts.length > 0 ? parts.length : 1;

    // Update bulk visible levels to match
    setBulkVisibleLevels(newVisibleLevels);

    setEtbRows(prevRows => {
      const updatedRows = prevRows.map((row) => {
        if (!selectedRowIds.has(row.id)) return row;

        // Update classification, grouping fields, AND visible levels to keep them in sync
        const updatedRow = {
          ...row,
          classification,
          grouping1: parts[0] || "",
          grouping2: parts[1] || "",
          grouping3: parts[2] || "",
          grouping4: parts[3] || "",
          visibleLevels: newVisibleLevels,
        };

        return updatedRow;
      });

      // Refresh classification summary after bulk update
      refreshClassificationSummary(updatedRows);

      return updatedRows;
    });
  }, [selectedRowIds, refreshClassificationSummary]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
    setBulkClassification("");
    setBulkVisibleLevels(4); // Reset bulk visible levels
  }, []);

  // Update bulk classification when selection changes (not when rows update)
  // We track previous selection to only update when selection actually changes
  const prevSelectionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check if selection actually changed
    const selectionChanged =
      prevSelectionRef.current.size !== selectedRowIds.size ||
      ![...selectedRowIds].every(id => prevSelectionRef.current.has(id));

    if (!selectionChanged) {
      return; // Don't update if selection didn't change
    }

    prevSelectionRef.current = new Set(selectedRowIds);

    if (selectedRowIds.size > 0) {
      // Get the classification of the first selected row
      const firstSelectedRow = etbRows.find(row => selectedRowIds.has(row.id));
      if (firstSelectedRow) {
        setBulkClassification(firstSelectedRow.classification || "");
        // Use the row's visibleLevels property, not calculated from classification
        setBulkVisibleLevels(firstSelectedRow.visibleLevels ?? 1);
      }
    } else {
      setBulkClassification("");
      setBulkVisibleLevels(4); // Reset to show all levels when no selection
    }
  }, [selectedRowIds, etbRows]);

  // Handle visible levels change for individual rows
  const handleVisibleLevelsChange = useCallback((rowId: string, levels: number) => {
    // Check if this is the bulk editor
    if (rowId === "bulk") {
      // Update bulk visible levels
      setBulkVisibleLevels(levels);

      // Apply to all selected rows
      setEtbRows(prevRows => {
        return prevRows.map((row) => {
          if (!selectedRowIds.has(row.id)) return row;
          return { ...row, visibleLevels: levels };
        });
      });
    } else {
      // Update individual row
      setEtbRows(prevRows => {
        return prevRows.map((row) => {
          if (row.id !== rowId) return row;
          return { ...row, visibleLevels: levels };
        });
      });
    }
  }, [selectedRowIds]);

  // Show adjustment details for a specific row
  const showAdjustmentDetailsForRow = useCallback(async (row: ETBRow) => {
    setSelectedRowForAdjustments(row);
    setShowAdjustmentDetails(true);
    setLoadingAdjustments(true);
    setAdjustmentsForRow([]);

    try {
      // Fetch all adjustments for this engagement
      const response = await adjustmentApi.getByEngagement(engagement._id);

      if (response.success) {
        // Filter to adjustments that affect this specific row
        const rowId = row._id || row.id || row.code;
        const relevantAdjustments = response.data.filter((adj: any) =>
          adj.entries.some((entry: any) =>
            entry.etbRowId === rowId ||
            entry.code === row.code
          )
        );

        setAdjustmentsForRow(relevantAdjustments);
      }
    } catch (error: any) {
      console.error("Error fetching adjustments:", error);
      toast({
        title: "Failed to load adjustments",
        description: error.message || "Could not fetch adjustment details",
        variant: "destructive",
      });
    } finally {
      setLoadingAdjustments(false);
    }
  }, [engagement._id, toast]);

  const showReclassificationDetailsForRow = useCallback(async (row: ETBRow) => {
    setSelectedRowForReclassifications(row);
    setShowReclassificationDetails(true);
    setLoadingReclassifications(true);
    setReclassificationsForRow([]);

    try {
      const response = await reclassificationApi.getByEngagement(engagement._id);

      if (response.success) {
        const rowId = row._id || row.id || row.code;
        const relevantReclassifications = response.data.filter((rc: any) =>
          rc.entries.some((entry: any) =>
            entry.etbRowId === rowId ||
            entry.code === row.code
          )
        );

        setReclassificationsForRow(relevantReclassifications);
      }
    } catch (error: any) {
      console.error("Error fetching reclassifications:", error);
      toast({
        title: "Failed to load reclassifications",
        description: error.message || "Could not fetch reclassification details",
        variant: "destructive",
      });
    } finally {
      setLoadingReclassifications(false);
    }
  }, [engagement._id, toast]);

  // Delete & reverse adjustment
  const handleDeleteAndReverseAdjustment = useCallback(async (adjustmentId: string) => {
    setDeletingAdjustments(prev => new Set(prev).add(adjustmentId));
    try {
      const response = await adjustmentApi.delete(adjustmentId);
      if (response.success) {
        toast({
          title: "Success",
          description: response.data?.wasPosted
            ? "Adjustment deleted and ETB impact reversed"
            : "Adjustment deleted successfully",
        });

        // Remove from list
        setAdjustmentsForDeleteRow(prev => prev.filter(adj => adj._id !== adjustmentId));

        // Reload ETB data to reflect changes
        await initializeETB();
      }
    } catch (error: any) {
      console.error("Error deleting adjustment:", error);
      toast({
        title: "Failed to delete adjustment",
        description: error.message || "Could not delete adjustment",
        variant: "destructive",
      });
    } finally {
      setDeletingAdjustments(prev => {
        const newSet = new Set(prev);
        newSet.delete(adjustmentId);
        return newSet;
      });
    }
  }, [toast, initializeETB]);

  // Delete & reverse reclassification
  const handleDeleteAndReverseReclassification = useCallback(async (reclassificationId: string) => {
    setDeletingReclassifications(prev => new Set(prev).add(reclassificationId));
    try {
      const response = await reclassificationApi.delete(reclassificationId);
      if (response.success) {
        toast({
          title: "Success",
          description: response.data?.wasPosted
            ? "Reclassification deleted and ETB impact reversed"
            : "Reclassification deleted successfully",
        });

        // Remove from list
        setReclassificationsForDeleteRow(prev => prev.filter(rc => rc._id !== reclassificationId));

        // Reload ETB data to reflect changes
        await initializeETB();
      }
    } catch (error: any) {
      console.error("Error deleting reclassification:", error);
      toast({
        title: "Failed to delete reclassification",
        description: error.message || "Could not delete reclassification",
        variant: "destructive",
      });
    } finally {
      setDeletingReclassifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(reclassificationId);
        return newSet;
      });
    }
  }, [toast, initializeETB]);

  // Close delete warning dialog and reset state
  const handleCloseDeleteWarning = useCallback(() => {
    setShowDeleteRowWarning(false);
    setRowToDelete(null);
    setAdjustmentsForDeleteRow([]);
    setReclassificationsForDeleteRow([]);
    setDeletingAdjustments(new Set());
    setDeletingReclassifications(new Set());
  }, []);

  // Proceed with row deletion after all adjustments/reclassifications are handled
  const handleConfirmDeleteRow = useCallback(() => {
    if (rowToDelete) {
      proceedWithRowDeletion(rowToDelete.id);
      handleCloseDeleteWarning();
    }
  }, [rowToDelete, proceedWithRowDeletion, handleCloseDeleteWarning]);

  // Manually trigger prior year population
  const populatePriorYearManually = useCallback(async () => {
    setIsPopulatingPriorYear(true);
    try {
      const res = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/trial-balance/populate-prior-year`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to populate prior year data");
      }

      const result = await res.json();

      console.log('[ETB] Populate Prior Year Result:', result);

      if (result.populated) {
        toast({
          title: "Prior Year Data Populated",
          description: result.details || "Prior year values have been updated",
        });

        console.log('[ETB] Reloading ETB data to show updated flags...');
        // Reload the ETB data to show the updated flags
        await initializeETB();
      } else {
        console.warn('[ETB] Prior year not populated:', result.message);
        toast({
          title: "No Changes Made",
          description: result.message || "No prior year data found to populate",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error populating prior year:", error);
      toast({
        title: "Failed to Populate Prior Year",
        description: error.message || "Could not populate prior year data",
        variant: "destructive",
      });
    } finally {
      setIsPopulatingPriorYear(false);
    }
  }, [engagement._id, toast, initializeETB]);

  // NOW WE CAN HAVE CONDITIONAL RETURNS SINCE ALL HOOKS ARE CALLED ABOVE
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader
          variant="pulse"
          size="lg"
          text={isPushingToCloud ? "Pushing to Excel Online..." : "Loading Extended Trial Balance..."}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ----- Main ETB Card (original UI preserved) ----- */}
      <Card className="border-muted-foreground/10 flex-1">
        <CardHeader className="top-0 z-10 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Extended Trial Balance
            </CardTitle>

            {/* Button group */}
            <div className="flex flex-wrap items-center gap-2">
              {!hasWorkbook ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => initializeExcelWorkbook(true)} // <-- CALL WITH TRUE
                  title="Create workbook and push data"
                  className="text-xs sm:text-sm bg-transparent"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Initialize Excel
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openInExcel}
                    title="Open workbook in Excel Online"
                    className="text-xs sm:text-sm bg-transparent"
                  >
                    <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">
                      Open in Excel Online
                    </span>
                    <span className="sm:hidden">Excel</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={pushToCloud}
                    disabled={isPushingToCloud}
                    title="Overwrite Excel from current ETB"
                    className="text-xs sm:text-sm bg-transparent"
                  >
                    {isPushingToCloud ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                    ) : (
                      <CloudUpload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">Push to Cloud</span>
                    <span className="sm:hidden">Push</span>
                  </Button>
                  {/* Read directly from localStorage on every render - no memoization */}
                  {(hasBeenPushed || checkHasBeenPushed || (() => {
                    try {
                      return localStorage.getItem(pushedKey) === "true";
                    } catch {
                      return false;
                    }
                  })()) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={pullFromCloud}
                        title="Fetch Excel back into ETB"
                        className="text-xs sm:text-sm bg-transparent"
                      >
                        <CloudDownload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Fetch from Cloud</span>
                        <span className="sm:hidden">Fetch</span>
                      </Button>
                    )}
                </>
              )}

              <Button
                variant="outline"
                onClick={() => saveETB(true)}
                disabled={saving}
                size="sm"
                className="text-xs sm:text-sm"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                )}
                Save ETB
              </Button>
              <Button
                onClick={addNewRow}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm bg-transparent"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Add Row
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Bulk Classification Editor */}
          {selectedRowIds.size > 0 && (
            <div className="mb-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Bulk Classification Editor
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {selectedRowIds.size} row{selectedRowIds.size > 1 ? 's' : ''} selected
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Change classification for all selected rows
                  </p>
                  <ClassificationCombos
                    key="bulk-editor"
                    rowId="bulk"
                    classification={bulkClassification}
                    onChange={(_, classification) => applyBulkClassification(classification)}
                    memoizedLevel1Options={memoizedLevel1Options}
                    visibleLevels={bulkVisibleLevels}
                    onVisibleLevelsChange={handleVisibleLevelsChange}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSelection}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Clear selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* New accounts notice */}
          {newAccountsCount > 0 && (
            <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>{newAccountsCount}</strong> new account{newAccountsCount > 1 ? 's' : ''} detected that {newAccountsCount > 1 ? 'were' : 'was'} not present in the previous year's data.
                {newAccountsCount > 1 ? ' These accounts are' : ' This account is'} marked with a "NEW" badge.
              </AlertDescription>
            </Alert>
          )}

          {/* Unclassified notice */}
          {unclassifiedRows.length > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {unclassifiedRows.length} rows are unclassified. You can save
                the ETB and classify them later.
              </AlertDescription>
            </Alert>
          )}

          {/* Grid */}
          <div className="rounded-lg border border-secondary border-b overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className=" bg-muted/50">
                  <TableRow>
                    <TableHead className="border border-r-secondary border-b-secondary align-middle text-center min-w-[3.5rem] w-[3.5rem] px-2">
                      <div>
                        <Checkbox
                          checked={selectedRowIds.size > 0 && selectedRowIds.size === etbRows.filter((row) => {
                            const code = (row.code || "").toString().trim().toUpperCase();
                            return !code.startsWith("TOTALS");
                          }).length}
                          onCheckedChange={toggleAllRows}
                          aria-label="Select all rows"
                          className="hidden"
                        />
                      </div>
                    </TableHead>
                    <TableHead className="border-b border-secondary sticky top-0 font-bold border-r w-[4rem] text-xs sm:text-sm">
                      Code
                    </TableHead>
                    <TableHead className="w-48 text-xs border-b border-r font-bold border-secondary sticky top-0 sm:text-sm">
                      Account Name
                    </TableHead>
                    <TableHead className="text-start border-b border-r border-secondary sticky top-0 font-bold w-24 text-xs sm:text-sm">
                      Current Year
                    </TableHead>
                    <TableHead className="w-48 text-xs border-b border-r border-secondary sticky top-0 font-bold sm:text-sm">
                      Re-Classification
                    </TableHead>
                    <TableHead className="text-start  border-b border-r border-secondary sticky top-0 font-bold w-20 text-xs sm:text-sm">
                      Adjustments
                    </TableHead>
                    <TableHead className="text-start border-b border-r border-secondary sticky top-0 font-bold w-20 text-xs sm:text-sm">
                      Final Balance
                    </TableHead>
                    <TableHead className="text-start border-b border-r border-secondary sticky top-0 font-bold w-24 text-xs sm:text-sm">
                      Prior Year
                    </TableHead>
                    <TableHead className="w-24 text-xs border-b border-r border-secondary sticky top-0 font-bold sm:text-sm">
                      Classification
                    </TableHead>
                    <TableHead className="w-20 text-xs border-b border-secondary sticky top-0 font-bold sm:text-sm">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {etbRows
                    .filter((row) => {
                      // Filter out rows where code starts with "TOTALS" (case-insensitive)
                      const code = (row.code || "").toString().trim().toUpperCase();
                      return !code.startsWith("TOTALS");
                    })
                    .map((row, idx) => (
                      <TableRow
                        key={row.id} // Use only the unique ID, not the code
                        className={cn(
                          idx % 2 === 1 && "bg-muted/20",
                          "hover:bg-muted/40 transition-colors",
                          selectedRowIds.has(row.id) && "bg-blue-50 dark:bg-blue-950/30"
                        )}
                      >
                        <TableCell className="border border-r-secondary border-b-secondary align-middle text-center min-w-[3.5rem] w-[3.5rem] px-2">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              id={`checkbox-${row.id}`} // Add a unique ID to the checkbox
                              checked={selectedRowIds.has(row.id)}
                              onCheckedChange={(checked) => {
                                // Prevent event propagation and ensure only this row is toggled
                                event.stopPropagation();
                                console.log('Checkbox changed for row:', row.id, 'Checked:', checked);
                                toggleRowSelection(row.id);
                              }}
                              aria-label={`Select row ${row.code || row.accountName}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="border border-r-secondary border-b-secondary align-middle">
                          <div className="flex items-center gap-2">
                            <EditableText
                              value={row.code}
                              onChange={(val) => updateRow(row.id, "code", val)}
                              className="font-mono text-xs sm:text-sm"
                            />
                            {row.isNewAccount && (
                              <Badge
                                variant="outline"
                                className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1 py-0 h-4"
                                title="This account code is new and was not found in the previous year"
                              >
                                NEW
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="border border-r-secondary border-b-secondary align-middle">
                          <EditableText
                            value={row.accountName}
                            onChange={(val) =>
                              updateRow(row.id, "accountName", val)
                            }
                            className="w-48 text-xs sm:text-sm"
                            placeholder="-"
                          />
                        </TableCell>
                        <TableCell className="text-start border border-r-secondary border-b-secondary align-middle">
                          <EditableText
                            type="number"
                            step={1}
                            value={Math.round(Number(row.currentYear) || 0)}
                            onChange={(val) =>
                              updateRow(row.id, "currentYear", val)
                            }
                            placeholder="0"
                            className="text-start text-xs sm:text-sm"
                          />
                        </TableCell>
                        <TableCell className="border border-r-secondary border-b-secondary align-middle">
                          <div className="flex items-center gap-2">
                            <span className="font-medium tabular-nums text-xs sm:text-sm">
                              {Math.round(Number(row.reclassification || 0)).toLocaleString()}
                            </span>
                            {row.reclassification !== 0 && row.reclassification != null && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-blue-100"
                                onClick={() => showReclassificationDetailsForRow(row)}
                                title="View reclassification details"
                              >
                                <Info className="h-3 w-3 text-blue-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-start border border-r-secondary border-b-secondary align-middle">
                          <div className="flex items-center gap-2">
                            <span className="font-medium tabular-nums text-xs sm:text-sm">
                              {Math.round(Number(row.adjustments)).toLocaleString()}
                            </span>
                            {row.adjustments !== 0 && row.adjustments != null && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-blue-100"
                                onClick={() => showAdjustmentDetailsForRow(row)}
                                title="View adjustment details"
                              >
                                <Info className="h-3 w-3 text-blue-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-fit border border-r-secondary border-b-secondary align-middle text-center font-medium tabular-nums text-xs sm:text-sm">
                          {Math.round(Number(row.finalBalance)).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-start border border-r-secondary border-b-secondary align-middle">
                          <EditableText
                            type="number"
                            value={Math.round(Number(row.priorYear) || 0)}
                            onChange={(val) => {
                              updateRow(row.id, "priorYear", val);
                            }}
                            placeholder="0"
                            className="text-start text-xs sm:text-sm"
                            step={1}
                          />
                        </TableCell>
                        <TableCell className="border border-r-secondary border-b-secondary align-top">
                          <div className="w-fit flex flex-col items-start gap-1 min-h-[2.5rem] py-1">
                            {/* <Badge
                            variant="outline"
                            className="cursor-pointer text-xs"
                            title="Jump to section"
                            onClick={() =>
                              row.classification &&
                              onClassificationJump?.(row.classification)
                            }
                          >
                            {formatClassificationForDisplay(row.classification)}
                          </Badge> */}
                            <ClassificationCombos
                              key={row.id}
                              rowId={row.id}
                              classification={row.classification}
                              onChange={handleClassificationChange}
                              memoizedLevel1Options={memoizedLevel1Options}
                              visibleLevels={row.visibleLevels ?? 0}
                              onVisibleLevelsChange={handleVisibleLevelsChange}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="w-20 border border-b-secondary align-middle">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteRow(row.id);
                            }}
                            className="text-red-600 hover:text-red-700 h-6 w-6 sm:h-8 sm:w-8"
                            aria-label="Delete row"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/60 font-medium">
                    <TableCell className="border border-r-secondary px-2"></TableCell>
                    <TableCell
                      colSpan={2}
                      className="border font-bold border-r-secondary text-xs sm:text-sm"
                    >
                      TOTALS
                    </TableCell>
                    <TableCell className="text-start font-bold text-xs border border-r-secondary  sm:text-sm">
                      {Math.round(totals.currentYear).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-start text-xs border border-r-secondary font-bold sm:text-sm">
                      {Math.round(totals.reclassification).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-start text-xs border border-r-secondary font-bold sm:text-sm">
                      {Math.round(totals.adjustments).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-start border border-r-secondary  font-bold text-xs sm:text-sm">
                      {Math.round(totals.finalBalance).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-start text-xs border border-r-secondary font-bold sm:text-sm">
                      {Math.round(totals.priorYear).toLocaleString()}
                    </TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>


            </div>
          </div>

          {/* Footer actions & summary */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                ...new Set(
                  etbRows.map((row) => row.classification).filter(Boolean)
                ),
              ].map((classification) => {
                const count = etbRows.filter(
                  (row) => row.classification === classification
                ).length;
                return (
                  <Badge
                    key={classification}
                    variant="secondary"
                    className="cursor-pointer text-xs"
                    onClick={() => onClassificationJump?.(classification)}
                    title="Open in Sections"
                  >
                    {formatClassificationForDisplay(classification)} ({count})
                  </Badge>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={addNewRow}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm bg-transparent"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Add Row
              </Button>
              <Button
                onClick={() => saveETB(true)}
                disabled={saving}
                size="sm"
                className="text-xs sm:text-sm"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Details Dialog */}
      <Dialog open={showAdjustmentDetails} onOpenChange={setShowAdjustmentDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjustment Details</DialogTitle>
            <DialogDescription>
              Adjustments affecting{" "}
              <span className="font-semibold">
                {selectedRowForAdjustments?.code} - {selectedRowForAdjustments?.accountName}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingAdjustments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-600">Loading adjustments...</span>
              </div>
            ) : adjustmentsForRow.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Info className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No adjustments found for this row</p>
                <p className="text-xs mt-1">
                  The adjustment value may have been set directly or come from a different source.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {adjustmentsForRow.map((adj: any) => {
                  // Get the row ID for highlighting
                  const rowId = selectedRowForAdjustments?._id || selectedRowForAdjustments?.id || selectedRowForAdjustments?.code;

                  // Calculate net impact on this specific row
                  const netImpactOnRow = adj.entries
                    .filter((entry: any) =>
                      entry.etbRowId === rowId || entry.code === selectedRowForAdjustments?.code
                    )
                    .reduce((sum: number, e: any) => sum + (e.dr || 0) - (e.cr || 0), 0);

                  return (
                    <Card key={adj._id} className="border-blue-200">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {/* Adjustment Header */}
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">
                              {adj.adjustmentNo}
                            </Badge>
                            <Badge variant={adj.status === "posted" ? "default" : "secondary"}>
                              {adj.status.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {adj.description || "No description"}
                            </span>
                          </div>

                          {/* ALL Entries in the adjustment */}
                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left border-r">Code</th>
                                  <th className="px-3 py-2 text-left border-r">Account</th>
                                  <th className="px-3 py-2 text-right border-r">Debit</th>
                                  <th className="px-3 py-2 text-right border-r">Credit</th>
                                  <th className="px-3 py-2 text-left">Details</th>
                                </tr>
                              </thead>
                              <tbody>
                                {adj.entries.map((entry: any, idx: number) => {
                                  // Highlight the row we clicked on
                                  const isClickedRow = entry.etbRowId === rowId || entry.code === selectedRowForAdjustments?.code;

                                  return (
                                    <tr
                                      key={idx}
                                      className={cn(
                                        "border-t",
                                        isClickedRow && "bg-blue-50 font-semibold"
                                      )}
                                    >
                                      <td className="px-3 py-2 border-r font-mono text-xs">
                                        {entry.code}
                                        {isClickedRow && (
                                          <Badge variant="outline" className="ml-2 text-xs">
                                            You are here
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 border-r">{entry.accountName}</td>
                                      <td className="px-3 py-2 border-r text-right">
                                        {entry.dr > 0 ? entry.dr.toLocaleString() : "-"}
                                      </td>
                                      <td className="px-3 py-2 border-r text-right">
                                        {entry.cr > 0 ? entry.cr.toLocaleString() : "-"}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600">
                                        {entry.details || "-"}
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Totals Row */}
                                <tr className="border-t bg-gray-100 font-semibold">
                                  <td colSpan={2} className="px-3 py-2 border-r">
                                    TOTAL
                                  </td>
                                  <td className="px-3 py-2 border-r text-right">
                                    {adj.totalDr.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 border-r text-right">
                                    {adj.totalCr.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge variant={adj.totalDr === adj.totalCr ? "default" : "destructive"}>
                                      {adj.totalDr === adj.totalCr ? "Balanced" : "Unbalanced"}
                                    </Badge>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Net Impact on THIS account */}
                          <div className="flex items-center justify-between text-sm bg-blue-50 p-3 rounded border border-blue-200">
                            <span className="font-medium">Net impact on {selectedRowForAdjustments?.accountName}:</span>
                            <span className="font-bold text-lg">
                              {netImpactOnRow.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Row Warning Dialog */}
      <Dialog open={showDeleteRowWarning} onOpenChange={(open) => {
        if (!open) {
          handleCloseDeleteWarning();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Warning: Row Has Adjustments or Reclassifications
            </DialogTitle>
            <DialogDescription>
              The row <span className="font-semibold">
                {rowToDelete?.code} - {rowToDelete?.accountName}
              </span> has associated adjustments or reclassifications that must be deleted & reversed before the row can be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Warning Message */}
            <Alert className="border-amber-300 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Important:</strong> Before deleting this ETB row, you must delete & reverse all adjustments and reclassifications that affect it.
                This will remove their impact from the ETB. Once all adjustments and reclassifications are handled, you can proceed with deleting the row.
              </AlertDescription>
            </Alert>

            {loadingDeleteRowData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-600">Loading adjustments and reclassifications...</span>
              </div>
            ) : (
              <>
                {/* Adjustments Section */}
                {adjustmentsForDeleteRow.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Adjustments ({adjustmentsForDeleteRow.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="space-y-2 p-3">
                        {adjustmentsForDeleteRow.map((adj: any) => (
                          <Card key={adj._id} className="border-blue-200">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="font-mono">
                                      {adj.adjustmentNo}
                                    </Badge>
                                    <Badge variant={adj.status === "posted" ? "default" : "secondary"}>
                                      {adj.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {adj.description || "No description"}
                                  </p>
                                  <div className="text-xs text-gray-500">
                                    DR: {adj.totalDr.toLocaleString()} | CR: {adj.totalCr.toLocaleString()}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteAndReverseAdjustment(adj._id)}
                                  disabled={deletingAdjustments.has(adj._id)}
                                >
                                  {deletingAdjustments.has(adj._id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Delete & Reverse
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reclassifications Section */}
                {reclassificationsForDeleteRow.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Reclassifications ({reclassificationsForDeleteRow.length})
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="space-y-2 p-3">
                        {reclassificationsForDeleteRow.map((rc: any) => (
                          <Card key={rc._id} className="border-purple-200">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="font-mono">
                                      {rc.reclassificationNo}
                                    </Badge>
                                    <Badge variant={rc.status === "posted" ? "default" : "secondary"}>
                                      {rc.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {rc.description || "No description"}
                                  </p>
                                  <div className="text-xs text-gray-500">
                                    DR: {rc.totalDr.toLocaleString()} | CR: {rc.totalCr.toLocaleString()}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteAndReverseReclassification(rc._id)}
                                  disabled={deletingReclassifications.has(rc._id)}
                                >
                                  {deletingReclassifications.has(rc._id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Delete & Reverse
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* No adjustments/reclassifications message */}
                {adjustmentsForDeleteRow.length === 0 && reclassificationsForDeleteRow.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Info className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No adjustments or reclassifications found for this row.</p>
                    <p className="text-xs mt-1">You can proceed with deletion.</p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDeleteWarning}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteRow}
              disabled={
                loadingDeleteRowData ||
                adjustmentsForDeleteRow.length > 0 ||
                reclassificationsForDeleteRow.length > 0
              }
            >
              {adjustmentsForDeleteRow.length > 0 || reclassificationsForDeleteRow.length > 0 ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Delete Row (Handle adjustments/reclassifications first)
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Row
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reclassification Details Dialog */}
      <Dialog open={showReclassificationDetails} onOpenChange={setShowReclassificationDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reclassification Details</DialogTitle>
            <DialogDescription>
              Reclassifications affecting{" "}
              <span className="font-semibold">
                {selectedRowForReclassifications?.code} - {selectedRowForReclassifications?.accountName}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingReclassifications ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-600">Loading reclassifications...</span>
              </div>
            ) : reclassificationsForRow.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Info className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No reclassifications found for this row</p>
                <p className="text-xs mt-1">
                  The reclassification value may have been set directly or come from a different source.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reclassificationsForRow.map((rc: any) => {
                  const rowId = selectedRowForReclassifications?._id || selectedRowForReclassifications?.id || selectedRowForReclassifications?.code;

                  const netImpactOnRow = rc.entries
                    .filter((entry: any) =>
                      entry.etbRowId === rowId || entry.code === selectedRowForReclassifications?.code
                    )
                    .reduce((sum: number, e: any) => sum + (e.dr || 0) - (e.cr || 0), 0);

                  return (
                    <Card key={rc._id} className="border-blue-200">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">
                              {rc.reclassificationNo}
                            </Badge>
                            <Badge variant={rc.status === "posted" ? "default" : "secondary"}>
                              {rc.status.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {rc.description || "No description"}
                            </span>
                          </div>

                          <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left border-r">Code</th>
                                  <th className="px-3 py-2 text-left border-r">Account</th>
                                  <th className="px-3 py-2 text-right border-r">Debit</th>
                                  <th className="px-3 py-2 text-right border-r">Credit</th>
                                  <th className="px-3 py-2 text-left">Details</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rc.entries.map((entry: any, idx: number) => {
                                  const isClickedRow = entry.etbRowId === rowId || entry.code === selectedRowForReclassifications?.code;

                                  return (
                                    <tr
                                      key={idx}
                                      className={cn(
                                        "border-t",
                                        isClickedRow && "bg-blue-50 font-semibold"
                                      )}
                                    >
                                      <td className="px-3 py-2 border-r font-mono text-xs">
                                        {entry.code}
                                        {isClickedRow && (
                                          <Badge variant="outline" className="ml-2 text-xs">
                                            You are here
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 border-r">{entry.accountName}</td>
                                      <td className="px-3 py-2 border-r text-right">
                                        {entry.dr > 0 ? entry.dr.toLocaleString() : "-"}
                                      </td>
                                      <td className="px-3 py-2 border-r text-right">
                                        {entry.cr > 0 ? entry.cr.toLocaleString() : "-"}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-600">
                                        {entry.details || "-"}
                                      </td>
                                    </tr>
                                  );
                                })}

                                <tr className="border-t bg-gray-100 font-semibold">
                                  <td colSpan={2} className="px-3 py-2 border-r">
                                    TOTAL
                                  </td>
                                  <td className="px-3 py-2 border-r text-right">
                                    {rc.totalDr.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 border-r text-right">
                                    {rc.totalCr.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge variant={rc.totalDr === rc.totalCr ? "default" : "destructive"}>
                                      {rc.totalDr === rc.totalCr ? "Balanced" : "Unbalanced"}
                                    </Badge>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-between text-sm bg-blue-50 p-3 rounded border border-blue-200">
                            <span className="font-medium">Net impact on {selectedRowForReclassifications?.accountName}:</span>
                            <span className="font-bold text-lg">
                              {netImpactOnRow.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExtendedTrialBalance;