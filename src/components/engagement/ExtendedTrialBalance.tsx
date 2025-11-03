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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { EnhancedLoader } from "../ui/enhanced-loader";
import EditableText from "../ui/editable-text";
// import { NEW_CLASSIFICATION_OPTIONS } from "./classificationOptions";

/* -------------------------------------------------------
   Helpers & Types
------------------------------------------------------- */

// Ensure each row has a unique client-only ID
const withClientIds = <T extends object>(rows: T[]) =>
  rows.map((r: any, i: number) => ({
    ...r,
    id:
      r.id ||
      r._id ||
      `row-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }));

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

interface ExtendedTrialBalanceProps {
  engagement: any;
  trialBalanceData: any;
  onClassificationChange: (classifications: string[]) => void;
  onClassificationJump?: (classification: string) => void;
  loadExistingData: any;
}

/* -------------------------------------------------------
   Domain data
------------------------------------------------------- */
const NEW_CLASSIFICATION_OPTIONS = [
  "Assets > Non-current > Intangible assets > Intangible assets - Cost",
  "Assets > Non-current > Intangible assets > Intangible assets - Accumulated Amortisation",
  "Assets > Non-current > Property, plant and equipment > Property, plant and equipment - Cost",
  "Assets > Non-current > Property, plant and equipment > Property, plant and equipment - Accumulated Depreciation",
  "Assets > Non-current > Investment property > Investment property - Cost",
  "Assets > Non-current > Investment property > Investment property - Accumulated Depreciation",
  "Assets > Non-current > Investment in subsidiary > Carrying amount",
  "Assets > Non-current > Investment in subsidiary > Share of profit for the",
  "Assets > Non-current > Investment in subsidiary > Distributions received",
  "Assets > Non-current > Investment in subsidiary > Capital contribution paid",
  "Assets > Non-current > Loan to subsidiary",
  "Assets > Non-current > Other non-current investments > HTM–quoted debt",
  "Assets > Non-current > Other non-current investments > AFS– quoted equity",
  "Assets > Current > Inventories > Raw materials and consumables",
  "Assets > Current > Inventories > Work in progress",
  "Assets > Current > Inventories > Finished goods",
  "Assets > Current > Trade and other receivables > Trade receivables from related parties",
  "Assets > Current > Trade and other receivables > Other trade receivables",
  "Assets > Current > Trade and other receivables > Amount due from subsidiary",
  "Assets > Current > Trade and other receivables > Prepayments and accrued income",
  "Assets > Current > Held-for-trading investments",
  "Assets > Current > Loan to subsidiary > Amount advanced to subsidiary",
  "Assets > Current > Loan to subsidiary > Capital contribution",
  "Assets > Current > Cash and bank balances > Cash at bank and on hand",
  "Assets > Current > Cash and bank balances > Bank overdraft",
  "Equity > Equity > Share capital",
  "Equity > Equity > Revaluation reserve",
  "Equity > Equity > Fair value reserve",
  "Equity > Equity > Retained earnings",
  "Equity > Current Year Profits & Losses > Revenue > Sale of goods",
  "Equity > Current Year Profits & Losses > Revenue > Rendering of services",
  "Equity > Current Year Profits & Losses > Cost of sales > Opening stock",
  "Equity > Current Year Profits & Losses > Cost of sales > Purchases",
  "Equity > Current Year Profits & Losses > Cost of sales > Carriage in",
  "Equity > Current Year Profits & Losses > Cost of sales > Closing stock",
  "Equity > Current Year Profits & Losses > Cost of sales > Other direct costs",
  "Equity > Current Year Profits & Losses > Cost of sales > Wages and salaries",
  "Equity > Current Year Profits & Losses > Cost of sales > Loose tools",
  "Equity > Current Year Profits & Losses > Cost of sales > Repairsand maintenance",
  "Equity > Current Year Profits & Losses > Cost of sales > Training and courses",
  "Equity > Current Year Profits & Losses > Cost of sales > Fuel and oil",
  "Equity > Current Year Profits & Losses > Cost of sales > Water and electricity",
  "Equity > Current Year Profits & Losses > Cost of sales > Professional fees",
  "Equity > Current Year Profits & Losses > Cost of sales > Insurances",
  "Equity > Current Year Profits & Losses > Cost of sales > Consumables",
  "Equity > Current Year Profits & Losses > Cost of sales > Depreciation",
  "Equity > Current Year Profits & Losses > Cost of sales > Provision for warranty costs",
  "Equity > Current Year Profits & Losses > Cost of sales > General expenses",
  "Equity > Current Year Profits & Losses > Sales and marketing expenses > Fairs and exhibitions",
  "Equity > Current Year Profits & Losses > Sales and marketing expenses > Advertising",
  "Equity > Current Year Profits & Losses > Sales and marketing expenses > Commissions payable",
  "Equity > Current Year Profits & Losses > Sales and marketing expenses > Market research and surveys",
  "Equity > Current Year Profits & Losses > Administrative expenses > Salaries",
  "Equity > Current Year Profits & Losses > Administrative expenses > Directors' remuneration",
  "Equity > Current Year Profits & Losses > Administrative expenses > Management fees",
  "Equity > Current Year Profits & Losses > Administrative expenses > Water andelectricity",
  "Equity > Current Year Profits & Losses > Administrative expenses > Repairs and maintenance",
  "Equity > Current Year Profits & Losses > Administrative expenses > Computer maintenance",
  "Equity > Current Year Profits & Losses > Administrative expenses > Office stationery and supplies",
  "Equity > Current Year Profits & Losses > Administrative expenses > Staff development",
  "Equity > Current Year Profits & Losses > Administrative expenses > Staff training",
  "Equity > Current Year Profits & Losses > Administrative expenses > Staff welfare",
  "Equity > Current Year Profits & Losses > Administrative expenses > Telecommunications",
  "Equity > Current Year Profits & Losses > Administrative expenses > Overseas travel",
  "Equity > Current Year Profits & Losses > Administrative expenses > Legal and professional fees",
  "Equity > Current Year Profits & Losses > Administrative expenses > Litigation settlement",
  "Equity > Current Year Profits & Losses > Administrative expenses > Audit fee",
  "Equity > Current Year Profits & Losses > Administrative expenses > Bank charges",
  "Equity > Current Year Profits & Losses > Administrative expenses > Insurance",
  "Equity > Current Year Profits & Losses > Administrative expenses > Subscriptions",
  "Equity > Current Year Profits & Losses > Administrative expenses > Baddebts written off",
  "Equity > Current Year Profits & Losses > Administrative expenses > Provision for doubtful debts",
  "Equity > Current Year Profits & Losses > Administrative expenses > Transport expenses",
  "Equity > Current Year Profits & Losses > Administrative expenses > General expenses",
  "Equity > Current Year Profits & Losses > Administrative expenses > Research costs",
  "Equity > Current Year Profits & Losses > Administrative expenses > Impairment loss on property, plant and equipment",
  "Equity > Current Year Profits & Losses > Administrative expenses > Depreciation",
  "Equity > Current Year Profits & Losses > Administrative expenses > Amortisation of intangible assets",
  "Equity > Current Year Profits & Losses > Other operating income > Rental income from operating leases",
  "Equity > Current Year Profits & Losses > Other operating income > Government grant",
  "Equity > Current Year Profits & Losses > Other operating income > Gain on disposal of property, plant and equipment",
  "Equity > Current Year Profits & Losses > Other operating income > Exchange gains",
  "Equity > Current Year Profits & Losses > Investment income > Interest income on cash and cash equivalents",
  "Equity > Current Year Profits & Losses > Investment income > Interest income from HFT investments",
  "Equity > Current Year Profits & Losses > Investment income > Interest income from HTM investments",
  "Equity > Current Year Profits & Losses > Investment income > Change in fair value of HFT investments",
  "Equity > Current Year Profits & Losses > Investment losses > Change in fair value of HFT investments",
  "Equity > Current Year Profits & Losses > Finance costs > Interest payable on finance lease",
  "Equity > Current Year Profits & Losses > Finance costs > Bank interest",
  "Equity > Current Year Profits & Losses > Finance costs > Dividends on redeemable cumulative preference shares",
  "Equity > Current Year Profits & Losses > Finance costs > Unwinding of discount on site restoration provision",
  "Equity > Current Year Profits & Losses > Share of profit of subsidiary",
  "Equity > Current Year Profits & Losses > Income tax expense > Current tax expense",
  "Equity > Current Year Profits & Losses > Income tax expense > Deferred tax expense",
  "Equity > Current Year Profits & Losses > PBT Expenses > Directors' remuneration",
  "Equity > Current Year Profits & Losses > PBT Expenses > Depreciation and amortisation expense",
  "Equity > Current Year Profits & Losses > PBT Expenses > Employee benefits expense",
  "Equity > Current Year Profits & Losses > PBT Expenses > Write-downs of inventories to net realisable value",
  "Equity > Current Year Profits & Losses > PBT Expenses > Impairment losses on property, plant and equipment",
  "Equity > Current Year Profits & Losses > PBT Expenses > Litigation settlement",
  "Equity > Current Year Profits & Losses > PBT Expenses > Audit fees",
  "Equity > Current Year Profits & Losses > PBT Expenses > Other assurance services",
  "Equity > Current Year Profits & Losses > PBT Expenses > Tax advisory services",
  "Equity > Current Year Profits & Losses > PBT Expenses > Other non-audit services",
  "Liabilities > Non-current > Borrowings > Redeemable preference shares",
  "Liabilities > Non-current > Borrowings > Finance lease obligations",
  "Liabilities > Non-current > Deferred tax liability",
  "Liabilities > Non-current > Provisions",
  "Liabilities > Current > Borrowings > Bank loan",
  "Liabilities > Current > Borrowings > Bank overdraft",
  "Liabilities > Current > Borrowings > Finance lease obligation",
  "Liabilities > Current > Trade and other payables > Trade payables",
  "Liabilities > Current > Trade and other payables > Other payables",
  "Liabilities > Current > Trade and other payables > Accrued expenses",
  "Liabilities > Current > Trade and other payables > Deferred government grant",
  "Liabilities > Current > Current tax liabilities",
  "Liabilities > Current > Provisions"
];


const CLASSIFICATION_RULES = [
  {
    keywords: ["bank", "cash", "petty"],
    classification: "Assets > Current > Cash and bank balances > Cash at bank and on hand",
  },
  {
    keywords: [
      "trade receivable",
      "trade debtor",
      "accounts receivable",
      "debtors",
    ],
    classification: "Assets > Current > Trade and other receivables > Other trade receivables",
  },
  {
    keywords: ["prepayment", "prepaid", "advance"],
    classification: "Assets > Current > Trade and other receivables > Prepayments and accrued income",
  },
  {
    keywords: ["inventory", "stock", "raw materials"],
    classification: "Assets > Current > Inventories > Raw materials and consumables",
  },
  {
    keywords: ["vat recoverable", "input vat", "tax receivable"],
    classification: "Assets > Current > Trade and other receivables > Other trade receivables",
  },
  {
    keywords: ["property", "plant", "equipment", "machinery", "furniture"],
    classification: "Assets > Non-current > Property, plant and equipment > Property, plant and equipment - Cost",
  },
  {
    keywords: ["trade payable", "creditors", "accounts payable", "supplier"],
    classification: "Liabilities > Current > Trade and other payables > Trade payables",
  },
  {
    keywords: ["accrual", "accrued"],
    classification: "Liabilities > Current > Trade and other payables > Accrued expenses",
  },
  {
    keywords: ["vat payable", "output vat", "tax payable"],
    classification: "Liabilities > Current > Current tax liabilities",
  },
  {
    keywords: ["loan", "borrowing", "mortgage"],
    classification: "Liabilities > Non-current > Borrowings > Finance lease obligations",
  },
  {
    keywords: ["share capital", "ordinary shares"],
    classification: "Equity > Equity > Share capital",
  },
  {
    keywords: ["retained earnings", "profit brought forward"],
    classification: "Equity > Equity > Retained earnings",
  },
  {
    keywords: ["sales", "revenue", "turnover", "income"],
    classification: "Equity > Current Year Profits & Losses > Revenue > Sale of goods",
  },
  {
    keywords: ["salary", "wages", "payroll"],
    classification: "Equity > Current Year Profits & Losses > Administrative expenses > Salaries",
  },
  {
    keywords: ["rent", "utilities", "electricity"],
    classification: "Equity > Current Year Profits & Losses > Administrative expenses > Water andelectricity",
  },
  {
    keywords: ["office", "admin", "stationery"],
    classification: "Equity > Current Year Profits & Losses > Administrative expenses > Office stationery and supplies",
  },
  {
    keywords: ["marketing", "advertising"],
    classification: "Equity > Current Year Profits & Losses > Sales and marketing expenses > Advertising",
  },
  {
    keywords: ["insurance", "premium"],
    classification: "Equity > Current Year Profits & Losses > Administrative expenses > Insurance",
  },
  {
    keywords: ["depreciation", "amortisation"],
    classification: "Equity > Current Year Profits & Losses > Administrative expenses > Depreciation",
  },
];

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

const formatClassificationForDisplay = (c: string) => {
  if (!c) return "—";
  const parts = c.split(" > ");
  const top = parts[0];
  if (top === "Assets" || top === "Liabilities" || top === "Equity") return parts[parts.length - 1];
  return top;
};

const hasNonZeroAdjustments = (rows: ETBRow[]) =>
  rows.some((r) => Number(r.adjustments) !== 0);

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
const ClassificationCombos = React.memo(({ rowId, classification, onChange, memoizedLevel1Options }: {
  rowId: string;
  classification: string;
  onChange: (rowId: string, classification: string) => void;
  memoizedLevel1Options: string[];
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

  return (
    <div className="flex flex-wrap gap-1 sm:gap-2">
      <SearchableSelect
        value={internalState.level1}
        onChange={handleL1Change}
        options={memoizedLevel1Options}
        placeholder="Level 1"
        className="max-h-44 overflow-y-auto"
        widthClass="w-fit"
      />
      {level2Options.length > 0 && (
        <SearchableSelect
          value={internalState.level2}
          className="max-h-44 overflow-y-auto"
          onChange={handleL2Change}
          options={level2Options}
          placeholder="Level 2"
          widthClass="w-fit"
        />
      )}
      {level3Options.length > 0 && (
        <SearchableSelect
          value={internalState.level3}
          onChange={handleL3Change}
          options={level3Options}
          placeholder="Level 3"
          className="max-h-44 overflow-y-auto"
          widthClass="w-fit"
        />
      )}
      {level4Options.length > 0 && (
        <SearchableSelect
          value={internalState.level4}
          onChange={handleL4Change}
          options={level4Options}
          placeholder="Level 4"
          className="max-h-44 overflow-y-auto"
          widthClass="w-fit"
        />
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
  useEffect(() => {
    console.log("CUREENT-Engagement", engagement);
  }, [engagement]);

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
        // Convert to number if the field is numeric
        const numericValue = (field === "currentYear" || field === "priorYear" ||
          field === "adjustments" || field === "finalBalance")
          ? Number(value) || 0
          : value;
        const updatedRow = { ...row, [field]: numericValue };
        if (field === "adjustments" || field === "currentYear") {
          updatedRow.finalBalance =
            Number(updatedRow.currentYear) + Number(updatedRow.adjustments);
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
    const checkAndSync = () => {
      // Always check localStorage and sync state, especially during/after push operations
      try {
        const pushedState = localStorage.getItem(pushedKey);
        if (pushedState === "true") {
          setHasBeenPushed((prev) => {
            // Always restore from localStorage if it's true, even during push
            if (!prev) {
              setForceUpdate((f) => f + 1);
              return true;
            }
            return prev;
          });
          // Force update regardless
          setForceUpdate((prev) => prev + 1);
        }
      } catch { }
    };

    // Check immediately
    checkAndSync();

    // Check multiple times to catch any re-renders from loadExistingData
    const timeoutId1 = setTimeout(checkAndSync, 50);
    const timeoutId2 = setTimeout(checkAndSync, 100);
    const timeoutId3 = setTimeout(checkAndSync, 200);
    const timeoutId4 = setTimeout(checkAndSync, 500);
    const timeoutId5 = setTimeout(checkAndSync, 1000);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(timeoutId4);
      clearTimeout(timeoutId5);
    };
  }, [forceUpdate, hasBeenPushed, pushing, pushedKey]); // Re-check when these change

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

  // init rows once
  useEffect(() => {
    if (trialBalanceData && etbRows.length === 0) initializeETB();
  }, [trialBalanceData, etbRows.length]);

  const autoClassify = useCallback((accountName: string): string => {
    const name = (accountName || "").toLowerCase();
    for (const rule of CLASSIFICATION_RULES) {
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
          const rowsWithIds = withClientIds(existingETB.rows);
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

      const etbData: ETBRow[] = rows.map((row: any[], index: number) => {
        const accountName = row[nameIndex] || "";
        const currentYear = Number(row[currentYearIndex]) || 0;
        const adjustments = 0;
        return {
          id: `row-${index}-${Date.now()}`,
          code: row[codeIndex] || "",
          accountName,
          currentYear,
          priorYear: Number(row[priorYearIndex]) || 0,
          adjustments,
          finalBalance: currentYear + adjustments,
          classification: autoClassify(accountName),
        };
      });

      setEtbRows(etbData);
      refreshClassificationSummary(etbData);

      // Auto-save the newly initialized ETB data to database (only if rows exist)
      if (etbData && etbData.length > 0) {
        await saveETB(false, etbData);
      }
    } catch (error) {
      console.error("Failed to initialize ETB:", error);
    } finally {
      setLoading(false);
    }
  }, [engagement._id, excelUrl, engagement?.excelURL, storageKey, trialBalanceData, autoClassify, refreshClassificationSummary]);

  const addNewRow = useCallback(() => {
    const newRow: ETBRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      code: "",
      accountName: "",
      currentYear: 0,
      priorYear: 0,
      adjustments: 0,
      finalBalance: 0,
      classification: "",
    };
    setEtbRows(prevRows => {
      const newRows = [...prevRows, newRow];
      refreshClassificationSummary(newRows);
      return newRows;
    });
  }, [refreshClassificationSummary]);

  const deleteRow = useCallback((id: string) => {
    setEtbRows(prevRows => {
      const newRows = prevRows.filter((row) => row.id !== id);
      refreshClassificationSummary(newRows);
      return newRows;
    });
  }, [refreshClassificationSummary]);

  // Save ETB (optionally mute toast, optionally pass custom rows)
  const saveETB = useCallback(async (showToast = true, customRows?: ETBRow[], skipLoadExistingData = false) => {
    const rowsToSave = customRows || etbRows;

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
          body: JSON.stringify({ rows: rowsToSave }),
        }
      );

      if (!response.ok)
        throw new Error("Failed to save Extended Trial Balance");

      refreshClassificationSummary(rowsToSave);
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
      const withIds = (etb.rows || []).map((r: any, i: number) => ({
        id: r.id || `row-${i}-${Date.now()}`,
        ...r,
      }));
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
          finalBalance: acc.finalBalance + (Number(row.finalBalance) || 0),
        }),
        { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 }
      ),
    [etbRows]
  );

  const unclassifiedRows = useMemo(() =>
    etbRows.filter((row) => !row.classification),
    [etbRows]
  );

  // CRITICAL: Derive actual pushing state from both state and ref
  // If ref says we're pushing, always show loader (even if state was reset)
  const actualPushing = pushing || isPushingRef.current;

  // CRITICAL: Derive actual pushingToCloud state from both state and ref
  // If ref says we're pushing, always show loader (even if state was reset)
  const actualPushingToCloud = pushingToCloud || isPushingToCloudRef.current;

  // Memoize the classification change handler
  const handleClassificationChange = useCallback((rowId: string, classification: string) => {
    updateRow(rowId, "classification", classification);
  }, [updateRow]);

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
                    <TableHead className="border-b border-secondary sticky top-0 font-bold border-r w-[4rem] text-xs sm:text-sm">
                      Code
                    </TableHead>
                    <TableHead className="w-48 text-xs border-b border-r font-bold border-secondary sticky top-0 sm:text-sm">
                      Account Name
                    </TableHead>
                    <TableHead className="text-start border-b border-r border-secondary sticky top-0 font-bold w-24 text-xs sm:text-sm">
                      Current Year
                    </TableHead>
                    <TableHead className="text-start border-b border-r border-secondary sticky top-0 font-bold w-24 text-xs sm:text-sm">
                      Prior Year
                    </TableHead>
                    <TableHead className="text-start  border-b border-r border-secondary sticky top-0 font-bold w-20 text-xs sm:text-sm">
                      Adjustments
                    </TableHead>
                    <TableHead className="text-start border-b border-r border-secondary sticky top-0 font-bold w-20 text-xs sm:text-sm">
                      Final Balance
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
                  {etbRows.map((row, idx) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        idx % 2 === 1 && "bg-muted/20",
                        "hover:bg-muted/40 transition-colors"
                      )}
                    >
                      <TableCell className="border border-r-secondary border-b-secondary ">
                        <EditableText
                          value={row.code}
                          onChange={(val) => updateRow(row.id, "code", val)}
                          className="font-mono text-xs sm:text-sm"
                        />
                      </TableCell>
                      <TableCell className="border border-r-secondary border-b-secondary ">
                        <EditableText
                          value={row.accountName}
                          onChange={(val) =>
                            updateRow(row.id, "accountName", val)
                          }
                          className="w-48 text-xs sm:text-sm"
                          placeholder="-"
                        />
                      </TableCell>
                      <TableCell className="text-start border border-r-secondary border-b-secondary ">
                        <EditableText
                          type="number"
                          step={1}
                          value={row.currentYear}
                          onChange={(val) =>
                            updateRow(row.id, "currentYear", val)
                          }
                          placeholder="0"
                          className="text-start text-xs sm:text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-start border border-r-secondary border-b-secondary ">
                        <EditableText
                          type="number"
                          value={row.priorYear}
                          onChange={(val) => {
                            updateRow(row.id, "priorYear", val);
                          }}
                          placeholder="0"
                          className="text-start text-xs sm:text-sm"
                          step={1}
                        />
                      </TableCell>
                      <TableCell className="text-start border border-r-secondary border-b-secondary ">
                        <EditableText
                          type="number"
                          value={row.adjustments}
                          onChange={(val) => {
                            updateRow(row.id, "adjustments", val);
                          }}
                          placeholder="0"
                          className="text-start text-xs sm:text-sm"
                          step={1}
                        />
                      </TableCell>
                      <TableCell className="w-fit border border-r-secondary border-b-secondary  text-center font-medium tabular-nums text-xs sm:text-sm">
                        {Math.round(Number(row.finalBalance)).toLocaleString()}
                      </TableCell>
                      <TableCell className="border border-r-secondary border-b-secondary flex justify-start">
                        <div className="w-fit flex flex-col items-start gap-1">
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
                          />
                        </div>
                      </TableCell>
                      <TableCell className="w-20 border border-b-secondary ">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRow(row.id)}
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
                      {Math.round(totals.priorYear).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-start text-xs border border-r-secondary font-bold sm:text-sm">
                      {Math.round(totals.adjustments).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-start border border-r-secondary  font-bold text-xs sm:text-sm">
                      {Math.round(totals.finalBalance).toLocaleString()}
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
    </div>
  );
};

export default ExtendedTrialBalance;