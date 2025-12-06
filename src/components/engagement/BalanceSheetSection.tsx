// @ts-nocheck
import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Download, Scale, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, FileText, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/hooks/useClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ensureRowGroupings } from "@/lib/classification-utils";

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
  reclassification?: number;
  grouping1?: string;
  grouping2?: string;
  grouping3?: string;
  grouping4?: string;
}

interface BalanceSheetSectionProps {
  engagement: any;
  etbRows: ETBRow[];
  financialYearStart?: string;
  financialYearEnd?: string;
}

interface GroupedRows {
  [grouping1: string]: {
    [grouping2: string]: {
      [grouping3: string]: {
        [grouping4: string]: ETBRow[];
      };
    };
  };
}

export const BalanceSheetSection: React.FC<BalanceSheetSectionProps> = ({
  engagement,
  etbRows,
  financialYearStart,
  financialYearEnd,
}) => {
  const [isCalculating, setIsCalculating] = useState(true);
  const [groupedData, setGroupedData] = useState<GroupedRows>({});
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();
  const { client, loading: clientLoading } = useClient(engagement?.clientId);

  // Get year labels
  const currentYearLabel = useMemo(() => {
    const yearEndDate = engagement?.yearEndDate || financialYearEnd;
    if (yearEndDate) {
      return new Date(yearEndDate).getFullYear().toString();
    }
    return "Current Year";
  }, [engagement, financialYearEnd]);

  const priorYearLabel = useMemo(() => {
    const yearEndDate = engagement?.yearEndDate || financialYearEnd;
    if (yearEndDate) {
      return (new Date(yearEndDate).getFullYear() - 1).toString();
    }
    return "Prior Year";
  }, [engagement, financialYearEnd]);

  // Filter and group balance sheet rows
  useEffect(() => {
    const calculateData = async () => {
      setIsCalculating(true);

      // Simulate async calculation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Filter rows for balance sheet (NOT Equity > Current Year Profits & Losses)
      // Ensure groupings are extracted from classification if missing
      const balanceSheetRows = etbRows
        .map(row => ensureRowGroupings(row))
        .filter((row) => {
          if (!row.grouping1 || !row.grouping2) return false;
          // Exclude income statement rows
          if (
            row.grouping1 === "Equity" &&
            row.grouping2 === "Current Year Profits & Losses"
          ) {
            return false;
          }
          // Filter out zero-balance rows (where all fields are zero)
          // This keeps the balance sheet clean and focused on accounts with activity
          const currentYear = Math.abs(row.currentYear || 0);
          const reclassification = Math.abs(row.reclassification || 0);
          const adjustments = Math.abs(row.adjustments || 0);
          const finalBalance = Math.abs(row.finalBalance || 0);
          const priorYear = Math.abs(row.priorYear || 0);
          
          // Filter out if all fields are zero
          if (currentYear === 0 && reclassification === 0 && adjustments === 0 && 
              finalBalance === 0 && priorYear === 0) {
            return false;
          }
          return true;
        });

      // Group by grouping1, grouping2, grouping3, and grouping4
      const grouped: GroupedRows = {};
      balanceSheetRows.forEach((row) => {
        const group1 = row.grouping1 || "Other";
        const group2 = row.grouping2 || "Other";
        const group3 = row.grouping3 || "_direct_"; // Use placeholder if no group3
        const group4 = row.grouping4 || "_direct_"; // Use placeholder if no group4

        if (!grouped[group1]) {
          grouped[group1] = {};
        }
        if (!grouped[group1][group2]) {
          grouped[group1][group2] = {};
        }
        if (!grouped[group1][group2][group3]) {
          grouped[group1][group2][group3] = {};
        }
        if (!grouped[group1][group2][group3][group4]) {
          grouped[group1][group2][group3][group4] = [];
        }
        grouped[group1][group2][group3][group4].push(row);
      });

      // Initialize all sections as expanded by default
      const initialExpanded: { [key: string]: boolean } = {};
      Object.entries(grouped).forEach(([group1, group2Map]) => {
        Object.entries(group2Map).forEach(([group2, group3Map]) => {
          Object.entries(group3Map).forEach(([group3, group4Map]) => {
            Object.keys(group4Map).forEach((group4) => {
              // Create unique keys for each level
              initialExpanded[`${group1}-${group2}`] = true;
              if (group3 !== "_direct_") {
                initialExpanded[`${group1}-${group2}-${group3}`] = true;
              }
              if (group4 !== "_direct_") {
                initialExpanded[`${group1}-${group2}-${group3}-${group4}`] = true;
              }
            });
          });
        });
      });
      setExpandedSections(initialExpanded);

      setGroupedData(grouped);
      setIsCalculating(false);
    };

    calculateData();
  }, [etbRows]);

  // Toggle section expand/collapse
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Expand all sections
  const expandAll = () => {
    const allExpanded: { [key: string]: boolean } = {};
    Object.entries(groupedData).forEach(([group1, group2Map]) => {
      Object.entries(group2Map).forEach(([group2, group3Map]) => {
        Object.entries(group3Map).forEach(([group3, group4Map]) => {
          Object.keys(group4Map).forEach((group4) => {
            allExpanded[`${group1}-${group2}`] = true;
            if (group3 !== "_direct_") {
              allExpanded[`${group1}-${group2}-${group3}`] = true;
            }
            if (group4 !== "_direct_") {
              allExpanded[`${group1}-${group2}-${group3}-${group4}`] = true;
            }
          });
        });
      });
    });
    setExpandedSections(allExpanded);
  };

  // Collapse all sections
  const collapseAll = () => {
    const allCollapsed: { [key: string]: boolean } = {};
    Object.entries(groupedData).forEach(([group1, group2Map]) => {
      Object.entries(group2Map).forEach(([group2, group3Map]) => {
        Object.entries(group3Map).forEach(([group3, group4Map]) => {
          Object.keys(group4Map).forEach((group4) => {
            allCollapsed[`${group1}-${group2}`] = false;
            if (group3 !== "_direct_") {
              allCollapsed[`${group1}-${group2}-${group3}`] = false;
            }
            if (group4 !== "_direct_") {
              allCollapsed[`${group1}-${group2}-${group3}-${group4}`] = false;
            }
          });
        });
      });
    });
    setExpandedSections(allCollapsed);
  };

  // Helper to check if a row is Retained Earnings (defined outside calculations for reuse)
  const isRetainedEarningsRow = (row: ETBRow): boolean => {
    return (
      row.grouping3 === "Retained earnings" ||
      row.accountName?.toLowerCase().includes("retained earnings") ||
      row.classification?.toLowerCase().includes("retained earnings")
    );
  };

  // Helper function to format Balance Sheet values (defined before calculations for use inside)
  // Preserves raw ETB signs for proper accounting summation
  // Only forces contra-assets to negative (they reduce asset values)
  const formatBalanceSheetValue = (value: number, accountName?: string): number => {
    const v = value ?? 0;
    const name = (accountName || "").toLowerCase();
    
    // Detect contra-assets
    const isContra =
      name.includes("accumulated") ||
      name.includes("provision") ||
      name.includes("allowance") ||
      name.includes("depreciation") ||
      name.includes("depn") ||
      name.includes("prov for");
    
    // Contra-assets must always reduce assets (force negative)
    if (isContra) return Math.abs(v) * -1;
    
    // For ALL other accounts, return raw ETB sign
    return v;
  };

  // Calculate totals
  const calculations = useMemo(() => {
    // Use the same GROUPING_SIGNS as Income Statement (must be defined first)
    const GROUPING_SIGNS: { [key: string]: "+" | "-" } = {
      Revenue: "+",
      "Cost of sales": "-",
      "Sales and marketing expenses": "-",
      "Administrative expenses": "-",
      "Other operating income": "+",
      "Investment income": "+",
      "Investment losses": "-",
      "Finance costs": "-",
      "Share of profit of subsidiary": "+",
      "PBT Expenses": "-",
      "Income tax expense": "-",
    };

    // STEP 2: Calculate Net Profit After Tax using EXACT same logic as IncomeStatementSection.tsx
    const calculateNetProfitAfterTax = (year: "current" | "prior"): number => {
      // Helper function - exact copy from IncomeStatementSection.tsx
      const getValueForGroup = (grouping3: string): number => {
        // Filter Income Statement rows and group by group4
        // Ensure groupings are extracted from classification if missing
        const incomeRows = etbRows
          .map(row => ensureRowGroupings(row))
          .filter(
            (row) =>
              row.grouping1 === "Equity" &&
              row.grouping2 === "Current Year Profits & Losses" &&
              row.grouping3 === grouping3
          );

        // Group by group4
        const group4Map: { [key: string]: ETBRow[] } = {};
        incomeRows.forEach((row) => {
          const group4 = row.grouping4 || "_direct_";
          if (!group4Map[group4]) {
            group4Map[group4] = [];
          }
          group4Map[group4].push(row);
        });

        // Sum all rows
        const sum = Object.values(group4Map).reduce((g4Acc, rows) => {
          const rowSum = rows.reduce((acc, row) => {
            const value = year === "current" ? row.finalBalance : row.priorYear;
            return acc + (value || 0);
          }, 0);
          return g4Acc + rowSum;
        }, 0);

        // Apply sign based on GROUPING_SIGNS - EXACT match to IncomeStatementSection.getValue
        const sign = GROUPING_SIGNS[grouping3] || "+";
        // For Income Statement calculation:
        // Revenue/Income items (sign = "+") should be positive: flip if negative
        // Expense items (sign = "-") should be negative: flip if positive
        let signedValue: number;
        if (sign === "+") {
          // Revenue/Income: ensure positive for calculation
          signedValue = sum < 0 ? -sum : sum;
        } else {
          // Expenses: ensure negative for calculation
          signedValue = sum > 0 ? -sum : sum;
        }
        
        if (sum !== 0) {
          console.log(`  ${grouping3}: rawSum=${sum}, sign=${sign}, result=${signedValue}`);
        }
        
        return signedValue;
      };
      
      // Calculate Net Profit After Tax using EXACT same formula as IncomeStatementSection.tsx
      // Gross Profit = Revenue - Cost of sales
      // Since Cost of sales is already negative, adding is equivalent to subtracting
      const grossProfit =
        getValueForGroup("Revenue") + getValueForGroup("Cost of sales");

      // Operating Profit = Gross Profit - Operating Expenses
      // Since expenses are already negative, adding them to Gross Profit is correct
      const operatingProfit =
        grossProfit +
        getValueForGroup("Sales and marketing expenses") +
        getValueForGroup("Administrative expenses") +
        getValueForGroup("Other operating income");

      // Net Profit Before Tax = Operating Profit + Investment income + Investment losses + Finance costs + Share of profit + PBT Expenses
      // Since expenses are already negative, adding them is correct
      const netProfitBeforeTax =
        operatingProfit +
        getValueForGroup("Investment income") +
        getValueForGroup("Investment losses") +
        getValueForGroup("Finance costs") +
        getValueForGroup("Share of profit of subsidiary") +
        getValueForGroup("PBT Expenses");

      // Net Profit After Tax = Net Profit Before Tax - Income tax expense
      // Since Income tax expense is already negative, adding it is equivalent to subtracting
      const netProfitAfterTax =
        netProfitBeforeTax + getValueForGroup("Income tax expense");

      return netProfitAfterTax;
    };

    // Only calculate for current year
    console.log("📊 Calculating Net Profit After Tax:");
    const netProfitAfterTaxCurrent = calculateNetProfitAfterTax("current");
    console.log("  Total Net Profit After Tax:", netProfitAfterTaxCurrent);

    // STEP 1: Get Retained Earnings from Prior Year (sum all accounts under Group3 "Retained earnings")
    const getRetainedEarningsPriorYear = (): number => {
      let retainedEarningsPrior = 0;
      
      // Sum all accounts under "Retained earnings" group3
      // Ensure groupings are extracted from classification if missing
      etbRows
        .map(row => ensureRowGroupings(row))
        .forEach((row) => {
          if (
            row.grouping1 === "Equity" &&
            row.grouping2 === "Equity" &&
            row.grouping3 === "Retained earnings"
          ) {
            // Sum all prior year values for retained earnings accounts
            retainedEarningsPrior += (row.priorYear || 0);
          }
        });

      return retainedEarningsPrior;
    };

    const retainedEarningsPriorYear = getRetainedEarningsPriorYear();
    
    // STEP 3: Calculate Current Year Retained Earnings
    // Formula: Current Retained Earnings = Prior Retained Earnings + Net Profit After Tax
    // Example: Prior RE = €3,000 + Net Profit = €1,000 → Current RE = €4,000
    // Example: Prior RE = €3,000 + Net Loss = -€2,000 → Current RE = €1,000
    const calculatedRetainedEarningsCurrent = retainedEarningsPriorYear + netProfitAfterTaxCurrent;

    // Debug logging
    console.log("🔢 Retained Earnings Calculation (Current Year Only):");
    console.log("  Total ETB Rows:", etbRows.length);
    console.log("  Income Statement Rows:", etbRows.filter(r => r.grouping1 === "Equity" && r.grouping2 === "Current Year Profits & Losses").length);
    console.log("  STEP 1 - Prior Year Retained Earnings:", retainedEarningsPriorYear);
    console.log("  STEP 2 - Current Year Net Profit After Tax:", netProfitAfterTaxCurrent);
    console.log("  STEP 3 - Calculated Current Year Retained Earnings:", calculatedRetainedEarningsCurrent);
    console.log("  Formula:", `${retainedEarningsPriorYear} + (${netProfitAfterTaxCurrent}) = ${calculatedRetainedEarningsCurrent}`);
    console.log("  Status:", netProfitAfterTaxCurrent >= 0 ? "✓ PROFIT" : "✗ LOSS");

    // Now define getGroup1Total with access to calculated retained earnings
    const getGroup1Total = (
      group1: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1]) return 0;

      // Sum formatted values (not raw values) to match individual row display
      // Round each value before summing to match displayed rounded values
      const sum = Object.entries(groupedData[group1])
        .filter(([group2]) => {
          // Exclude "Current Year Profits & Losses" from Equity calculations
          if (group1 === "Equity" && group2 === "Current Year Profits & Losses") {
            return false;
          }
          return true;
        })
        .reduce((acc, [_, group3Map]) => {
          const group3Sum = Object.values(group3Map).reduce((g3Acc, group4Map) => {
            const group4Sum = Object.values(group4Map).reduce((g4Acc, rows) => {
              const rowSum = rows.reduce((rowAcc, row) => {
                // Use formatted value with preserved signs for accurate summation
                const rawValue = year === "current" ? row.finalBalance : row.priorYear;
                const value = formatBalanceSheetValue(rawValue || 0, row.accountName);
                // Sum without rounding - rounding happens at display time only
                return rowAcc + (value || 0);
              }, 0);
              return g4Acc + rowSum;
            }, 0);
            return g3Acc + group4Sum;
          }, 0);
          return acc + group3Sum;
        }, 0);
      
      // Assets shown naturally, Liabilities & Equity shown positive
      if (group1 === "Assets") return sum;
      return Math.abs(sum);
    };

    const getGroup2Total = (
      group1: string,
      group2: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1] || !groupedData[group1][group2]) return 0;

      // Sum formatted values (not raw values) to match individual row display
      // Round each value before summing to match displayed rounded values
      const sum = Object.values(groupedData[group1][group2]).reduce((g3Acc, group4Map) => {
        const group4Sum = Object.values(group4Map).reduce((g4Acc, rows) => {
          const rowSum = rows.reduce((rowAcc, row) => {
            // Use formatted value with preserved signs for accurate summation
            const rawValue = year === "current" ? row.finalBalance : row.priorYear;
            const value = formatBalanceSheetValue(rawValue || 0, row.accountName);
            // Sum without rounding - rounding happens at display time only
            return rowAcc + (value || 0);
          }, 0);
          return g4Acc + rowSum;
        }, 0);
        return g3Acc + group4Sum;
      }, 0);
      
      // Assets shown naturally, Liabilities & Equity shown positive
      if (group1 === "Assets") return sum;
      return Math.abs(sum);
    };

    const getGroup3Total = (
      group1: string,
      group2: string,
      group3: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1] || !groupedData[group1][group2] || !groupedData[group1][group2][group3]) return 0;

      // Special case: Retained Earnings calculated at Group3 level
      if (group1 === "Equity" && group2 === "Equity" && group3 === "Retained earnings") {
        if (year === "current") {
          // Use calculated retained earnings for current year
          return Math.abs(calculatedRetainedEarningsCurrent);
        } else {
          // Sum all prior year values for retained earnings accounts
          const priorSum = Object.values(groupedData[group1][group2][group3]).reduce((g4Acc, rows) => {
            const rowSum = rows.reduce((rowAcc, row) => {
              const rawValue = row.priorYear || 0;
              const value = formatBalanceSheetValue(rawValue, row.accountName);
              return rowAcc + (value || 0);
            }, 0);
            return g4Acc + rowSum;
          }, 0);
          return Math.abs(priorSum);
        }
      }

      // For all other Group3s, sum normally
      const sum = Object.values(groupedData[group1][group2][group3]).reduce((g4Acc, rows) => {
        const rowSum = rows.reduce((rowAcc, row) => {
          // Use formatted value with preserved signs for accurate summation
          const rawValue = year === "current" ? row.finalBalance : row.priorYear;
          const value = formatBalanceSheetValue(rawValue || 0, row.accountName);
          // Sum without rounding - rounding happens at display time only
          return rowAcc + (value || 0);
        }, 0);
        return g4Acc + rowSum;
      }, 0);
      
      // Assets shown naturally, Liabilities & Equity shown positive
      if (group1 === "Assets") return sum;
      return Math.abs(sum);
    };

    const getGroup4Total = (
      group1: string,
      group2: string,
      group3: string,
      group4: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1] || !groupedData[group1][group2] || !groupedData[group1][group2][group3] || !groupedData[group1][group2][group3][group4]) return 0;

      // Sum formatted values (not raw values) to match individual row display
      // Round each value before summing to match displayed rounded values
      const sum = groupedData[group1][group2][group3][group4].reduce((acc, row) => {
        // Use formatted value with preserved signs for accurate summation
        const rawValue = year === "current" ? row.finalBalance : row.priorYear;
        const value = formatBalanceSheetValue(rawValue || 0, row.accountName);
        // Sum without rounding - rounding happens at display time only
        return acc + (value || 0);
      }, 0);
      
      // Assets shown naturally (including negative contra-assets)
      // Liabilities & Equity shown positive
      if (group1 === "Assets") return sum;
      return Math.abs(sum);
    };

    // Helper to get raw totals (without Math.abs) for balance check
    const getRawGroup1Total = (
      group1: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1]) return 0;

      const sum = Object.entries(groupedData[group1])
        .filter(([group2]) => {
          // Exclude "Current Year Profits & Losses" from Equity calculations
          if (group1 === "Equity" && group2 === "Current Year Profits & Losses") {
            return false;
          }
          return true;
        })
        .reduce((acc, [_, group3Map]) => {
          const group3Sum = Object.values(group3Map).reduce((g3Acc, group4Map) => {
            const group4Sum = Object.values(group4Map).reduce((g4Acc, rows) => {
              const rowSum = rows.reduce((rowAcc, row) => {
                // Use formatted value with preserved signs for accurate summation
                const rawValue = year === "current" ? row.finalBalance : row.priorYear;
                const value = formatBalanceSheetValue(rawValue || 0, row.accountName);
                // Sum without rounding - rounding happens at display time only
                return rowAcc + (value || 0);
              }, 0);
              return g4Acc + rowSum;
            }, 0);
            return g3Acc + group4Sum;
          }, 0);
          return acc + group3Sum;
        }, 0);
      
      // Return raw sum (no Math.abs) for balance check
      return sum;
    };

    const assetsCurrent = getGroup1Total("Assets", "current");
    const assetsPrior = getGroup1Total("Assets", "prior");

    const liabilitiesCurrent = getGroup1Total("Liabilities", "current");
    const liabilitiesPrior = getGroup1Total("Liabilities", "prior");

    const equityCurrent = getGroup1Total("Equity", "current");
    const equityPrior = getGroup1Total("Equity", "prior");

    // Balance check: Assets + Liabilities + Equity = 0 (using raw values with proper signs)
    // In accounting: Assets (debit/positive) + Liabilities (credit/negative) + Equity (credit/negative) = 0
    const rawAssetsCurrent = getRawGroup1Total("Assets", "current");
    const rawLiabilitiesCurrent = getRawGroup1Total("Liabilities", "current");
    const rawEquityCurrent = getRawGroup1Total("Equity", "current");
    const balanceCurrent = rawAssetsCurrent + rawLiabilitiesCurrent + rawEquityCurrent;

    const rawAssetsPrior = getRawGroup1Total("Assets", "prior");
    const rawLiabilitiesPrior = getRawGroup1Total("Liabilities", "prior");
    const rawEquityPrior = getRawGroup1Total("Equity", "prior");
    const balancePrior = rawAssetsPrior + rawLiabilitiesPrior + rawEquityPrior;

    return {
      getGroup1Total,
      getGroup2Total,
      getGroup3Total,
      getGroup4Total,
      assetsCurrent,
      assetsPrior,
      liabilitiesCurrent,
      liabilitiesPrior,
      equityCurrent,
      equityPrior,
      balanceCurrent,
      balancePrior,
      netProfitAfterTaxCurrent,
      retainedEarningsPriorYear,
      calculatedRetainedEarningsCurrent,
    };
  }, [groupedData, etbRows]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // PDF-specific formatting function that returns "-" for zero values
  const formatCurrencyForPDF = (value: number): string => {
    // Round to whole number first
    const roundedValue = Math.round(value);
    
    // Return "-" if value is zero
    if (roundedValue === 0) {
      return "-";
    }
    
    // Format with commas, no decimal places (like reference PDF)
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(roundedValue);
  };

  // Format values for PDF with parentheses for negative values
  const formatValueForPDF = (value: number): string => {
    // Round to whole number
    const roundedValue = Math.round(value);
    
    // Return "-" if value is zero
    if (roundedValue === 0) {
      return "-";
    }
    
    // Format with commas, no decimal places
    const formatted = new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(roundedValue));
    
    // Show negative values in parentheses
    return roundedValue < 0 ? `(${formatted})` : formatted;
  };

  // Format table row values: rounded to whole numbers, with parentheses for negative values
  const formatTableRowValue = (value: number): string => {
    // Round to whole number
    const roundedValue = Math.round(value);
    
    // Return "-" if value is zero
    if (roundedValue === 0) {
      return "-";
    }
    
    // Format with commas, no decimal places
    const formatted = new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(roundedValue));
    
    // Show negative values in parentheses
    return roundedValue < 0 ? `(${formatted})` : formatted;
  };

  // Format totals: rounded to whole numbers, with parentheses for negative values
  const formatTotalValue = (value: number): string => {
    // Round to whole number
    const roundedValue = Math.round(value);
    
    // Return "-" if value is zero
    if (roundedValue === 0) {
      return "-";
    }
    
    // Format with commas, no decimal places
    const formatted = new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(roundedValue));
    
    // Show negative values in parentheses
    return roundedValue < 0 ? `(${formatted})` : formatted;
  };

  // Helper to get the display value for a row
  const getRowCurrentYearValue = (row: ETBRow): number => {
    return formatBalanceSheetValue(row.finalBalance || 0, row.accountName);
  };

  const getRowPriorYearValue = (row: ETBRow): number => {
    return formatBalanceSheetValue(row.priorYear || 0, row.accountName);
  };

  const downloadPDF = (includeDetailRows: boolean = true) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Balance Sheet", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(
        client?.company_name || engagement?.clientName || "Client Name",
        pageWidth / 2,
        28,
        { align: "center" }
      );
      doc.text(`As at ${currentYearLabel}`, pageWidth / 2, 35, {
        align: "center",
      });

      // Table data
      const tableData: any[] = [];

      // Helper function to check if group2 is "Non-current" or "Current" (for Assets section only)
      const isAssetsSubsection = (group2: string): boolean => {
        const lower = group2.toLowerCase().trim();
        return lower === "non-current" || lower === "current";
      };

      // Helper function to render group3 items
      const renderGroup3Items = (group1: string, group2: string, group3Map: any) => {
        Object.entries(group3Map).forEach(([group3, group4Map]) => {
          const hasGroup3 = group3 !== "_direct_";

          if (hasGroup3 && includeDetailRows) {
            const group3CurrentTotal = calculations.getGroup3Total(group1, group2, group3, "current");
            const group3PriorTotal = calculations.getGroup3Total(group1, group2, group3, "prior");
            
            // Find the note number from the first row in this group3
            let noteNumber = "";
            for (const rows of Object.values(group4Map)) {
              if (rows.length > 0 && rows[0]?.code) {
                noteNumber = rows[0].code;
                break;
              }
            }
            
            tableData.push([
              { content: `  ${group3}`, styles: { textColor: [0, 0, 0] } },
              { content: noteNumber || "", styles: { halign: "center", textColor: [0, 0, 0] } },
              {
                content: formatValueForPDF(group3CurrentTotal),
                styles: { halign: "right", textColor: [0, 0, 0] },
              },
              {
                content: formatValueForPDF(group3PriorTotal),
                styles: { halign: "right", textColor: [0, 0, 0] },
              },
            ]);
          }
        });
      };

      // ========== ASSETS SECTION ==========
      if (groupedData["Assets"]) {
        // Add ASSETS header (no values on this row)
        tableData.push([
          { content: "ASSETS", styles: { fontStyle: "bold", fontSize: 11, textColor: [0, 0, 0] } },
          "",
          "",
          "",
        ]);

        // Process Assets group2 sections
        Object.entries(groupedData["Assets"]).forEach(([group2, group3Map]) => {
          const currentTotal = calculations.getGroup2Total("Assets", group2, "current");
          const priorTotal = calculations.getGroup2Total("Assets", group2, "prior");

          // Add group2 header (no values on this row)
          tableData.push([
            { content: group2, styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
            "",
            "",
            "",
          ]);

          // Render all group3 items
          renderGroup3Items("Assets", group2, group3Map);

          // Add empty row with totals ONLY for "Non-current assets" and "Current assets"
          if (isAssetsSubsection(group2)) {
            tableData.push([
              "",
              "",
              {
                content: formatValueForPDF(currentTotal),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
              {
                content: formatValueForPDF(priorTotal),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
            ]);
          }
        });

        // Add Total Assets
        const assetsCurrent = calculations.getGroup1Total("Assets", "current");
        const assetsPrior = calculations.getGroup1Total("Assets", "prior");
        tableData.push([
          {
            content: "Total Assets",
            styles: { fontStyle: "bold", textColor: [0, 0, 0] },
          },
          "",
          {
            content: formatValueForPDF(assetsCurrent),
            styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
          },
          {
            content: formatValueForPDF(assetsPrior),
            styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
          },
        ]);

        // Add spacing
        tableData.push(["", "", "", ""]);
      }

      // ========== EQUITY AND LIABILITIES SECTION ==========
      tableData.push([
        { content: "EQUITY AND LIABILITIES", styles: { fontStyle: "bold", fontSize: 11, textColor: [0, 0, 0] } },
        "",
        "",
        "",
      ]);

      // ========== EQUITY SUBSECTION ==========
      if (groupedData["Equity"]) {
        // Add EQUITY header (no values on this row)
        tableData.push([
          { content: "EQUITY", styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
          "",
          "",
          "",
        ]);

        // Process Equity group2 sections (exclude Current Year Profits & Losses)
        Object.entries(groupedData["Equity"])
          .filter(([group2]) => group2 !== "Current Year Profits & Losses")
          .forEach(([group2, group3Map]) => {
            // Add group2 header (no values on this row)
            tableData.push([
              { content: group2, styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
              "",
              "",
              "",
            ]);

            // Render all group3 items
            renderGroup3Items("Equity", group2, group3Map);

            // NO empty row with totals for Equity sections
          });

        // Add Total Equity
        const equityCurrent = calculations.getGroup1Total("Equity", "current");
        const equityPrior = calculations.getGroup1Total("Equity", "prior");
        tableData.push([
          {
            content: "Total Equity",
            styles: { fontStyle: "bold", textColor: [0, 0, 0] },
          },
          "",
          {
            content: formatValueForPDF(equityCurrent),
            styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
          },
          {
            content: formatValueForPDF(equityPrior),
            styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
          },
        ]);

        // Add spacing
        tableData.push(["", "", "", ""]);
      }

      // ========== LIABILITIES SUBSECTION ==========
      if (groupedData["Liabilities"]) {
        // Add LIABILITIES header (no values on this row)
        tableData.push([
          { content: "LIABILITIES", styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
          "",
          "",
          "",
        ]);

        // Process Liabilities group2 sections
        Object.entries(groupedData["Liabilities"]).forEach(([group2, group3Map]) => {
          // Add group2 header (no values on this row)
          tableData.push([
            { content: group2, styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
            "",
            "",
            "",
          ]);

          // Render all group3 items
          renderGroup3Items("Liabilities", group2, group3Map);

          // NO empty row with totals for Liabilities sections
        });

        // Add Total Liabilities
        const liabilitiesCurrent = calculations.getGroup1Total("Liabilities", "current");
        const liabilitiesPrior = calculations.getGroup1Total("Liabilities", "prior");
        tableData.push([
          {
            content: "Total Liabilities",
            styles: { fontStyle: "bold", textColor: [0, 0, 0] },
          },
          "",
          {
            content: formatValueForPDF(liabilitiesCurrent),
            styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
          },
          {
            content: formatValueForPDF(liabilitiesPrior),
            styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
          },
        ]);
      }

      // ========== TOTAL EQUITY AND LIABILITIES ==========
      tableData.push([
        {
          content: "TOTAL EQUITY AND LIABILITIES",
          styles: { fontStyle: "bold", textColor: [0, 0, 0] },
        },
        "",
        {
          content: formatValueForPDF(
            calculations.liabilitiesCurrent + calculations.equityCurrent
          ),
          styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
        },
        {
          content: formatValueForPDF(
            calculations.liabilitiesPrior + calculations.equityPrior
          ),
          styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
        },
      ]);

      // Add balance check
      tableData.push([
        {
          content: "Balance Check (Assets = Liabilities + Equity)",
          styles: { fontStyle: "bold", textColor: [0, 0, 0] },
        },
        "",
        {
          content: formatValueForPDF(calculations.balanceCurrent),
          styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
        },
        {
          content: formatValueForPDF(calculations.balancePrior),
          styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
        },
      ]);

      autoTable(doc, {
        startY: 45,
        head: [
          [
            { content: "Description", styles: { halign: 'left' } },
            { content: "Notes", styles: { halign: 'center' } },
            { content: currentYearLabel, styles: { halign: 'right' } },
            { content: priorYearLabel, styles: { halign: 'right' } },
          ]
        ],
        body: tableData,
        theme: "plain",
        headStyles: { fillColor: false, textColor: [0, 0, 0], fontStyle: "bold", lineWidth: { bottom: 0 }, lineColor: [0, 0, 0] },
        styles: { fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 'auto', textColor: [0, 0, 0] },
          1: { cellWidth: 20, halign: 'center', textColor: [0, 0, 0] },
          2: { cellWidth: 'auto', halign: 'right', textColor: [0, 0, 0] },
          3: { cellWidth: 'auto', halign: 'right', textColor: [0, 0, 0] },
        },
      });

      const fileName = includeDetailRows
        ? `Balance_Sheet_Detailed_${client?.company_name || engagement?.clientName || "Client"}_${currentYearLabel}.pdf`
        : `Balance_Sheet_Summary_${client?.company_name || engagement?.clientName || "Client"}_${currentYearLabel}.pdf`;
      
      doc.save(fileName);

      toast({
        title: "Success",
        description: "Balance Sheet PDF downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  if (isCalculating) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" />
          <p className="text-gray-600">Calculating Balance Sheet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-yellow-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Scale className="h-6 w-6" />
              Balance Sheet
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {clientLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading client...
                </span>
              ) : (
                <>
                  {client?.company_name || engagement?.clientName || "Client Name"} • As at{" "}
                  {currentYearLabel}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Expand/Collapse All Buttons */}
            <Button
              onClick={expandAll}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <ChevronsDown className="h-3 w-3 mr-1" />
              Expand All
            </Button>
            <Button
              onClick={collapseAll}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <ChevronsUp className="h-3 w-3 mr-1" />
              Collapse All
            </Button>
            
            {/* PDF Download Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadPDF(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download Balance Sheet
                </DropdownMenuItem>
                {/* <DropdownMenuItem onClick={() => downloadPDF(false)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download Balance Sheet (Summary)
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Balance Check Alert */}
          {(Math.abs(calculations.balanceCurrent) > 0.01 ||
            Math.abs(calculations.balancePrior) > 0.01) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-semibold text-red-800">
                ⚠️ Balance Sheet does not balance!
              </p>
              <p className="text-sm text-red-700 mt-1">
                The accounting equation (Assets = Liabilities + Equity) is not
                satisfied. Please review your classifications.
              </p>
            </div>
          )}

          {Math.abs(calculations.balanceCurrent) <= 0.01 &&
            Math.abs(calculations.balancePrior) <= 0.01 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-800">
                  ✓ Balance Sheet is balanced
                </p>
                <p className="text-sm text-green-700 mt-1">
                  The accounting equation (Assets = Liabilities + Equity) is
                  satisfied.
                </p>
              </div>
            )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-amber-100 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-semibold">
                        Description
                      </th>
                      <th className="text-left p-3 font-semibold w-24">
                        Notes
                      </th>
                      <th className="text-right p-3 font-semibold w-32">
                        {currentYearLabel}
                      </th>
                      <th className="text-right p-3 font-semibold w-32">
                        {priorYearLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Assets Section */}
                    {groupedData["Assets"] && (
                      <>
                        <tr className="bg-gray-200">
                          <td
                            colSpan={4}
                            className="p-3 font-bold text-lg uppercase"
                          >
                            Assets
                          </td>
                        </tr>

                        {Object.entries(groupedData["Assets"]).map(
                          ([group2, group3Map]) => {
                            const group2Key = `Assets-${group2}`;
                            const isGroup2Expanded = expandedSections[group2Key];
                            
                            return (
                            <React.Fragment key={group2}>
                              {/* Group2 Header with Toggle */}
                              <tr 
                                className="bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                                onClick={() => toggleSection(group2Key)}
                              >
                                <td className="p-3 font-semibold">
                                  <div className="flex items-center gap-2">
                                    {isGroup2Expanded ? (
                                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                    )}
                                    <span>{group2}</span>
                                  </div>
                                </td>
                                <td className="p-3"></td>
                                <td className="p-3 text-right font-semibold">
                                  {formatTotalValue(
                                    calculations.getGroup2Total(
                                      "Assets",
                                      group2,
                                      "current"
                                    )
                                  )}
                                </td>
                                <td className="p-3 text-right font-semibold">
                                  {formatTotalValue(
                                    calculations.getGroup2Total(
                                      "Assets",
                                      group2,
                                      "prior"
                                    )
                                  )}
                                </td>
                              </tr>

                              {/* Group3 and Group4 levels */}
                              {isGroup2Expanded && Object.entries(group3Map).map(([group3, group4Map]) => {
                                const hasGroup3 = group3 !== "_direct_";
                                const group3Key = `Assets-${group2}-${group3}`;
                                const isGroup3Expanded = expandedSections[group3Key];

                                return (
                                  <React.Fragment key={group3}>
                                    {/* Group3 Header (only if not direct) */}
                                    {hasGroup3 && (
                                      <tr 
                                        className="bg-gray-100 border-t cursor-pointer hover:bg-gray-200"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSection(group3Key);
                                        }}
                                      >
                                        <td className="p-2 pl-8 font-medium text-sm">
                                          <div className="flex items-center gap-2">
                                            {isGroup3Expanded ? (
                                              <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                            )}
                                            <span>{group3}</span>
                                          </div>
                                        </td>
                                        <td className="p-2"></td>
                                        <td className="p-2 text-right text-sm font-medium">
                                          {formatTotalValue(
                                            calculations.getGroup3Total(
                                              "Assets",
                                              group2,
                                              group3,
                                              "current"
                                            )
                                          )}
                                        </td>
                                        <td className="p-2 text-right text-sm font-medium">
                                          {formatTotalValue(
                                            calculations.getGroup3Total(
                                              "Assets",
                                              group2,
                                              group3,
                                              "prior"
                                            )
                                          )}
                                        </td>
                                      </tr>
                                    )}

                                    {/* Group4 level and rows */}
                                    {(!hasGroup3 || isGroup3Expanded) && Object.entries(group4Map).map(([group4, rows]) => {
                                      const hasGroup4 = group4 !== "_direct_";
                                      const group4Key = `Assets-${group2}-${group3}-${group4}`;
                                      const isGroup4Expanded = expandedSections[group4Key];
                                      const indentLevel = hasGroup3 && hasGroup4 ? 16 : hasGroup3 || hasGroup4 ? 12 : 8;

                                      return (
                                        <React.Fragment key={group4}>
                                          {/* Group4 Header (only if not direct) */}
                                          {hasGroup4 && (
                                            <tr 
                                              className="bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSection(group4Key);
                                              }}
                                            >
                                              <td className={`p-2 pl-${hasGroup3 ? '12' : '10'} text-sm`}>
                                                <div className="flex items-center gap-2">
                                                  {isGroup4Expanded ? (
                                                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                                  )}
                                                  <span>{group4}</span>
                                                </div>
                                              </td>
                                              <td className="p-2"></td>
                                              <td className="p-2 text-right text-sm">
                                                {formatTotalValue(
                                                  calculations.getGroup4Total(
                                                    "Assets",
                                                    group2,
                                                    group3,
                                                    group4,
                                                    "current"
                                                  )
                                                )}
                                              </td>
                                              <td className="p-2 text-right text-sm">
                                                {formatTotalValue(
                                                  calculations.getGroup4Total(
                                                    "Assets",
                                                    group2,
                                                    group3,
                                                    group4,
                                                    "prior"
                                                  )
                                                )}
                                              </td>
                                            </tr>
                                          )}

                                          {/* Detail Rows */}
                                          {(!hasGroup4 || isGroup4Expanded) && rows.map((row) => (
                                            <tr
                                              key={row.id}
                                              className="border-b hover:bg-gray-50"
                                            >
                                              <td className={`p-2 pl-${indentLevel} text-xs`}>
                                                {row.accountName}
                                              </td>
                                              <td className="p-2 text-xs text-gray-600">
                                                {row.code || ""}
                                              </td>
                                              <td className="p-2 text-right text-xs">
                                                {formatTableRowValue(getRowCurrentYearValue(row))}
                                              </td>
                                              <td className="p-2 text-right text-xs">
                                                {formatTableRowValue(getRowPriorYearValue(row))}
                                              </td>
                                            </tr>
                                          ))}
                                        </React.Fragment>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          )}
                        )}

                        {/* Total Assets */}
                        <tr className="bg-amber-100 border-t-2 border-amber-300">
                          <td className="p-3 font-bold text-lg">
                            Total Assets
                          </td>
                          <td className="p-3"></td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatTotalValue(calculations.assetsCurrent)}
                          </td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatTotalValue(calculations.assetsPrior)}
                          </td>
                        </tr>
                      </>
                    )}

                    {/* Spacing */}
                    <tr>
                      <td colSpan={4} className="p-2"></td>
                    </tr>

                    {/* Liabilities Section */}
                    {groupedData["Liabilities"] && (
                      <>
                        <tr className="bg-gray-200">
                          <td
                            colSpan={4}
                            className="p-3 font-bold text-lg uppercase"
                          >
                            Liabilities
                          </td>
                        </tr>

                        {Object.entries(groupedData["Liabilities"]).map(
                          ([group2, group3Map]) => {
                            const group2Key = `Liabilities-${group2}`;
                            const isGroup2Expanded = expandedSections[group2Key];
                            
                            return (
                            <React.Fragment key={group2}>
                              {/* Group2 Header with Toggle */}
                              <tr 
                                className="bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                                onClick={() => toggleSection(group2Key)}
                              >
                                <td className="p-3 font-semibold">
                                  <div className="flex items-center gap-2">
                                    {isGroup2Expanded ? (
                                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                    )}
                                    <span>{group2}</span>
                                  </div>
                                </td>
                                <td className="p-3"></td>
                                <td className="p-3 text-right font-semibold">
                                  {formatTotalValue(
                                    calculations.getGroup2Total(
                                      "Liabilities",
                                      group2,
                                      "current"
                                    )
                                  )}
                                </td>
                                <td className="p-3 text-right font-semibold">
                                  {formatTotalValue(
                                    calculations.getGroup2Total(
                                      "Liabilities",
                                      group2,
                                      "prior"
                                    )
                                  )}
                                </td>
                              </tr>

                              {/* Group3 and Group4 levels */}
                              {isGroup2Expanded && Object.entries(group3Map).map(([group3, group4Map]) => {
                                const hasGroup3 = group3 !== "_direct_";
                                const group3Key = `Liabilities-${group2}-${group3}`;
                                const isGroup3Expanded = expandedSections[group3Key];

                                return (
                                  <React.Fragment key={group3}>
                                    {/* Group3 Header */}
                                    {hasGroup3 && (
                                      <tr 
                                        className="bg-gray-100 border-t cursor-pointer hover:bg-gray-200"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSection(group3Key);
                                        }}
                                      >
                                        <td className="p-2 pl-8 font-medium text-sm">
                                          <div className="flex items-center gap-2">
                                            {isGroup3Expanded ? (
                                              <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                            )}
                                            <span>{group3}</span>
                                          </div>
                                        </td>
                                        <td className="p-2"></td>
                                        <td className="p-2 text-right text-sm font-medium">
                                          {formatTotalValue(
                                            calculations.getGroup3Total(
                                              "Liabilities",
                                              group2,
                                              group3,
                                              "current"
                                            )
                                          )}
                                        </td>
                                        <td className="p-2 text-right text-sm font-medium">
                                          {formatTotalValue(
                                            calculations.getGroup3Total(
                                              "Liabilities",
                                              group2,
                                              group3,
                                              "prior"
                                            )
                                          )}
                                        </td>
                                      </tr>
                                    )}

                                    {/* Group4 level and rows */}
                                    {(!hasGroup3 || isGroup3Expanded) && Object.entries(group4Map).map(([group4, rows]) => {
                                      const hasGroup4 = group4 !== "_direct_";
                                      const group4Key = `Liabilities-${group2}-${group3}-${group4}`;
                                      const isGroup4Expanded = expandedSections[group4Key];
                                      const indentLevel = hasGroup3 && hasGroup4 ? 16 : hasGroup3 || hasGroup4 ? 12 : 8;

                                      return (
                                        <React.Fragment key={group4}>
                                          {/* Group4 Header */}
                                          {hasGroup4 && (
                                            <tr 
                                              className="bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSection(group4Key);
                                              }}
                                            >
                                              <td className={`p-2 pl-${hasGroup3 ? '12' : '10'} text-sm`}>
                                                <div className="flex items-center gap-2">
                                                  {isGroup4Expanded ? (
                                                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                                  )}
                                                  <span>{group4}</span>
                                                </div>
                                              </td>
                                              <td className="p-2"></td>
                                              <td className="p-2 text-right text-sm">
                                                {formatTotalValue(
                                                  calculations.getGroup4Total(
                                                    "Liabilities",
                                                    group2,
                                                    group3,
                                                    group4,
                                                    "current"
                                                  )
                                                )}
                                              </td>
                                              <td className="p-2 text-right text-sm">
                                                {formatTotalValue(
                                                  calculations.getGroup4Total(
                                                    "Liabilities",
                                                    group2,
                                                    group3,
                                                    group4,
                                                    "prior"
                                                  )
                                                )}
                                              </td>
                                            </tr>
                                          )}

                                          {/* Detail Rows */}
                                          {(!hasGroup4 || isGroup4Expanded) && rows.map((row) => (
                                            <tr
                                              key={row.id}
                                              className="border-b hover:bg-gray-50"
                                            >
                                              <td className={`p-2 pl-${indentLevel} text-xs`}>
                                                {row.accountName}
                                              </td>
                                              <td className="p-2 text-xs text-gray-600">
                                                {row.code || ""}
                                              </td>
                                              <td className="p-2 text-right text-xs">
                                                {formatTableRowValue(getRowCurrentYearValue(row))}
                                              </td>
                                              <td className="p-2 text-right text-xs">
                                                {formatTableRowValue(getRowPriorYearValue(row))}
                                              </td>
                                            </tr>
                                          ))}
                                        </React.Fragment>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          )}
                        )}

                        {/* Total Liabilities */}
                        <tr className="bg-amber-100 border-t-2 border-amber-300">
                          <td className="p-3 font-bold text-lg">
                            Total Liabilities
                          </td>
                          <td className="p-3"></td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatTotalValue(calculations.liabilitiesCurrent)}
                          </td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatTotalValue(calculations.liabilitiesPrior)}
                          </td>
                        </tr>
                      </>
                    )}

                    {/* Spacing */}
                    <tr>
                      <td colSpan={4} className="p-2"></td>
                    </tr>

                    {/* Equity Section */}
                    {groupedData["Equity"] && (
                      <>
                        <tr className="bg-gray-200">
                          <td
                            colSpan={4}
                            className="p-3 font-bold text-lg uppercase"
                          >
                            Equity
                          </td>
                        </tr>

                        {Object.entries(groupedData["Equity"])
                          .filter(([group2]) => group2 !== "Current Year Profits & Losses")
                          .map(([group2, group3Map]) => {
                            const group2Key = `Equity-${group2}`;
                            const isGroup2Expanded = expandedSections[group2Key];
                            
                            return (
                            <React.Fragment key={group2}>
                              {/* Group2 Header with Toggle */}
                              <tr 
                                className="bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                                onClick={() => toggleSection(group2Key)}
                              >
                                <td className="p-3 font-semibold">
                                  <div className="flex items-center gap-2">
                                    {isGroup2Expanded ? (
                                      <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                    )}
                                    <span>{group2}</span>
                                  </div>
                                </td>
                                <td className="p-3"></td>
                                <td className="p-3 text-right font-semibold">
                                  {formatTotalValue(
                                    calculations.getGroup2Total(
                                      "Equity",
                                      group2,
                                      "current"
                                    )
                                  )}
                                </td>
                                <td className="p-3 text-right font-semibold">
                                  {formatTotalValue(
                                    calculations.getGroup2Total(
                                      "Equity",
                                      group2,
                                      "prior"
                                    )
                                  )}
                                </td>
                              </tr>

                              {/* Group3 and Group4 levels */}
                              {isGroup2Expanded && Object.entries(group3Map).map(([group3, group4Map]) => {
                                const hasGroup3 = group3 !== "_direct_";
                                const group3Key = `Equity-${group2}-${group3}`;
                                const isGroup3Expanded = expandedSections[group3Key];

                                return (
                                  <React.Fragment key={group3}>
                                    {/* Group3 Header */}
                                    {hasGroup3 && (
                                      <tr 
                                        className="bg-gray-100 border-t cursor-pointer hover:bg-gray-200"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSection(group3Key);
                                        }}
                                      >
                                        <td className="p-2 pl-8 font-medium text-sm">
                                          <div className="flex items-center gap-2">
                                            {isGroup3Expanded ? (
                                              <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                            )}
                                            <span>{group3}</span>
                                          </div>
                                        </td>
                                        <td className="p-2"></td>
                                        <td className="p-2 text-right text-sm font-medium">
                                          <div className="flex items-center justify-end gap-1">
                                            {formatTotalValue(
                                              calculations.getGroup3Total(
                                                "Equity",
                                                group2,
                                                group3,
                                                "current"
                                              )
                                            )}
                                            {group3 === "Retained earnings" && (
                                              <Dialog>
                                                <DialogTrigger asChild>
                                                  <button 
                                                    className="text-blue-600 hover:text-blue-800"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    <Info className="h-3 w-3" />
                                                  </button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md">
                                                  <DialogHeader>
                                                    <DialogTitle>Retained Earnings Calculation</DialogTitle>
                                                    <DialogDescription>
                                                      Auto-calculated for {currentYearLabel}
                                                    </DialogDescription>
                                                  </DialogHeader>
                                                  <div className="space-y-3">
                                                    <div className="flex justify-between items-center py-2 border-b">
                                                      <span className="text-sm">Prior Year ({priorYearLabel}) Retained Earnings:</span>
                                                      <strong className="text-sm">{formatCurrency(calculations.retainedEarningsPriorYear)}</strong>
                                                    </div>
                                                    <div className="flex justify-between items-center py-2 border-b">
                                                      <span className="text-sm">Current Year Net Result:</span>
                                                      <div className="text-right">
                                                        <strong className={`text-sm ${calculations.netProfitAfterTaxCurrent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                          {calculations.netProfitAfterTaxCurrent >= 0 ? '✓ Profit' : '✗ Loss'}
                                                        </strong>
                                                        <div className="text-sm font-semibold">
                                                          {formatCurrency(calculations.netProfitAfterTaxCurrent)}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="flex justify-between items-center py-3 bg-blue-50 rounded px-3">
                                                      <span className="font-semibold">Calculated {currentYearLabel} Retained Earnings:</span>
                                                      <strong className="text-lg">{formatCurrency(calculations.calculatedRetainedEarningsCurrent)}</strong>
                                                    </div>
                                                    <div className="text-xs text-gray-600 italic mt-2 p-2 bg-gray-50 rounded">
                                                      <strong>Formula:</strong> {formatCurrency(calculations.retainedEarningsPriorYear)} + ({formatCurrency(calculations.netProfitAfterTaxCurrent)}) = {formatCurrency(calculations.calculatedRetainedEarningsCurrent)}
                                                    </div>
                                                  </div>
                                                </DialogContent>
                                              </Dialog>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-2 text-right text-sm font-medium">
                                          {formatTotalValue(
                                            calculations.getGroup3Total(
                                              "Equity",
                                              group2,
                                              group3,
                                              "prior"
                                            )
                                          )}
                                        </td>
                                      </tr>
                                    )}

                                    {/* Group4 level and rows */}
                                    {(!hasGroup3 || isGroup3Expanded) && Object.entries(group4Map).map(([group4, rows]) => {
                                      const hasGroup4 = group4 !== "_direct_";
                                      const group4Key = `Equity-${group2}-${group3}-${group4}`;
                                      const isGroup4Expanded = expandedSections[group4Key];
                                      const indentLevel = hasGroup3 && hasGroup4 ? 16 : hasGroup3 || hasGroup4 ? 12 : 8;

                                      return (
                                        <React.Fragment key={group4}>
                                          {/* Group4 Header */}
                                          {hasGroup4 && (
                                            <tr 
                                              className="bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSection(group4Key);
                                              }}
                                            >
                                              <td className={`p-2 pl-${hasGroup3 ? '12' : '10'} text-sm`}>
                                                <div className="flex items-center gap-2">
                                                  {isGroup4Expanded ? (
                                                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                                  )}
                                                  <span>{group4}</span>
                                                </div>
                                              </td>
                                              <td className="p-2"></td>
                                              <td className="p-2 text-right text-sm">
                                                {formatTotalValue(
                                                  calculations.getGroup4Total(
                                                    "Equity",
                                                    group2,
                                                    group3,
                                                    group4,
                                                    "current"
                                                  )
                                                )}
                                              </td>
                                              <td className="p-2 text-right text-sm">
                                                {formatTotalValue(
                                                  calculations.getGroup4Total(
                                                    "Equity",
                                                    group2,
                                                    group3,
                                                    group4,
                                                    "prior"
                                                  )
                                                )}
                                              </td>
                                            </tr>
                                          )}

                                          {/* Detail Rows */}
                                          {(!hasGroup4 || isGroup4Expanded) && rows.map((row) => (
                                            <tr
                                              key={row.id}
                                              className="border-b hover:bg-gray-50"
                                            >
                                              <td className={`p-2 pl-${indentLevel} text-xs`}>
                                                {row.accountName}
                                              </td>
                                              <td className="p-2 text-xs text-gray-600">
                                                {row.code || ""}
                                              </td>
                                              <td className="p-2 text-right text-xs">
                                                {formatTableRowValue(getRowCurrentYearValue(row))}
                                              </td>
                                              <td className="p-2 text-right text-xs">
                                                {formatTableRowValue(getRowPriorYearValue(row))}
                                              </td>
                                            </tr>
                                          ))}
                                        </React.Fragment>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          )}
                        )}

                        {/* Total Equity */}
                        <tr className="bg-amber-100 border-t-2 border-amber-300">
                          <td className="p-3 font-bold text-lg">
                            Total Equity
                          </td>
                          <td className="p-3"></td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatTotalValue(calculations.equityCurrent)}
                          </td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatTotalValue(calculations.equityPrior)}
                          </td>
                        </tr>

                        {/* Total Liabilities + Equity */}
                        <tr className="bg-amber-200 border-t-2 border-amber-400">
                          <td className="p-3 font-bold text-lg">
                            Total Liabilities + Equity
                          </td>
                          <td className="p-3"></td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatTotalValue(
                              calculations.liabilitiesCurrent +
                                calculations.equityCurrent
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatTotalValue(
                              calculations.liabilitiesPrior +
                                calculations.equityPrior
                            )}
                          </td>
                        </tr>
                      </>
                    )}

                    {/* Balance Check Row */}
                    <tr
                      className={`border-t-4 ${
                        Math.abs(calculations.balanceCurrent) <= 0.01 &&
                        Math.abs(calculations.balancePrior) <= 0.01
                          ? "bg-green-100 border-green-500"
                          : "bg-red-100 border-red-500"
                      }`}
                    >
                      <td className="p-4 font-bold text-lg">
                        Balance Check (Assets = Liabilities + Equity)
                      </td>
                      <td className="p-4"></td>
                      <td className="p-4 text-right font-bold text-lg">
                        {formatTotalValue(calculations.balanceCurrent)}
                      </td>
                      <td className="p-4 text-right font-bold text-lg">
                        {formatTotalValue(calculations.balancePrior)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

