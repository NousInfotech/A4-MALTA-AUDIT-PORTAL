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
  // In Balance Sheets:
  // - Assets, Liabilities, and Equity should be positive (absolute value)
  // - Contra-assets (like Accumulated Depreciation) should be negative (they reduce asset values)
  const formatBalanceSheetValue = (value: number, accountName?: string): number => {
    // Check if this is a contra-asset (typically has "Accumulated", "Provision", "Allowance", "Depn" in name)
    const isContraAsset = accountName && (
      accountName.toLowerCase().includes("accumulated") ||
      accountName.toLowerCase().includes("provision") ||
      accountName.toLowerCase().includes("allowance") ||
      accountName.toLowerCase().includes("depreciation") ||
      accountName.toLowerCase().includes("depn") || // Handle abbreviation "Depn"
      accountName.toLowerCase().includes("prov for") // Handle "Prov for Depn" pattern
    );
    
    // Contra-assets should always be negative (they reduce asset values)
    // Convert to absolute value first, then make negative
    if (isContraAsset) {
      const absValue = value < 0 ? -value : value;
      return -absValue; // Always return negative for contra-assets
    }
    
    // For all other Balance Sheet items, return absolute value
    // This handles cases where data is stored as negative (credit balances)
    return value < 0 ? -value : value;
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

        // Apply sign based on GROUPING_SIGNS
        const sign = GROUPING_SIGNS[grouping3] || "+";
        const signedValue = sign === "+" ? sum : -sum;
        
        if (sum !== 0) {
          console.log(`  ${grouping3}: rawSum=${sum}, sign=${sign}, result=${signedValue}`);
        }
        
        return signedValue;
      };
      
      // Net Profit Before Tax section
      const investmentIncome = getValueForGroup("Investment income");
      const investmentLosses = getValueForGroup("Investment losses");
      const financeCosts = getValueForGroup("Finance costs");
      const shareOfProfit = getValueForGroup("Share of profit of subsidiary");
      const pbtExpenses = getValueForGroup("PBT Expenses");
      
      // Net Profit After Tax section
      const incomeTax = getValueForGroup("Income tax expense");

      // Calculate Net Profit After Tax (sum all components)
      const netProfitAfterTax = 
        investmentIncome + investmentLosses + financeCosts + shareOfProfit + 
        pbtExpenses + incomeTax;

      return netProfitAfterTax;
    };

    // Only calculate for current year
    console.log("📊 Calculating Net Profit After Tax:");
    const netProfitAfterTaxCurrent = calculateNetProfitAfterTax("current");
    console.log("  Total Net Profit After Tax:", netProfitAfterTaxCurrent);

    // STEP 1: Get Retained Earnings from Prior Year (from the row data)
    const getRetainedEarningsPriorYear = (): number => {
      let retainedEarningsPrior = 0;
      
      // Search directly in etbRows for Retained Earnings
      // Ensure groupings are extracted from classification if missing
      etbRows
        .map(row => ensureRowGroupings(row))
        .forEach((row) => {
          if (
            row.grouping1 === "Equity" &&
            row.grouping2 === "Equity" &&
            isRetainedEarningsRow(row)
          ) {
            retainedEarningsPrior = row.priorYear || 0;
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
                // Special case: Use calculated value for Retained Earnings current year
                let value: number;
                if (year === "current" && isRetainedEarningsRow(row)) {
                  value = calculatedRetainedEarningsCurrent;
                } else {
                  // Use formatted value (absolute) to match row display
                  const rawValue = year === "current" ? row.finalBalance : row.priorYear;
                  value = formatBalanceSheetValue(rawValue || 0, row.accountName);
                }
                // Round to whole number before summing
                return rowAcc + Math.round(value || 0);
              }, 0);
              return g4Acc + rowSum;
            }, 0);
            return g3Acc + group4Sum;
          }, 0);
          return acc + group3Sum;
        }, 0);
      
      // Sum is already positive (from formatBalanceSheetValue), but ensure it's positive
      return sum < 0 ? -sum : sum;
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
            // Special case for Retained Earnings current year
            let value: number;
            if (year === "current" && isRetainedEarningsRow(row)) {
              value = calculatedRetainedEarningsCurrent;
            } else {
              // Use formatted value (absolute) to match row display
              const rawValue = year === "current" ? row.finalBalance : row.priorYear;
              value = formatBalanceSheetValue(rawValue || 0, row.accountName);
            }
            // Round to whole number before summing
            return rowAcc + Math.round(value || 0);
          }, 0);
          return g4Acc + rowSum;
        }, 0);
        return g3Acc + group4Sum;
      }, 0);
      
      // Sum is already positive (from formatBalanceSheetValue), but ensure it's positive
      return sum < 0 ? -sum : sum;
    };

    const getGroup3Total = (
      group1: string,
      group2: string,
      group3: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1] || !groupedData[group1][group2] || !groupedData[group1][group2][group3]) return 0;

      // Sum formatted values (not raw values) to match individual row display
      // Round each value before summing to match displayed rounded values
      const sum = Object.values(groupedData[group1][group2][group3]).reduce((g4Acc, rows) => {
        const rowSum = rows.reduce((rowAcc, row) => {
          // Special case for Retained Earnings current year
          let value: number;
          if (year === "current" && isRetainedEarningsRow(row)) {
            value = calculatedRetainedEarningsCurrent;
          } else {
            // Use formatted value (absolute) to match row display
            const rawValue = year === "current" ? row.finalBalance : row.priorYear;
            value = formatBalanceSheetValue(rawValue || 0, row.accountName);
          }
          // Round to whole number before summing
          return rowAcc + Math.round(value || 0);
        }, 0);
        return g4Acc + rowSum;
      }, 0);
      
      // Sum is already positive (from formatBalanceSheetValue), but ensure it's positive
      return sum < 0 ? -sum : sum;
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
        // Special case for Retained Earnings current year
        let value: number;
        if (year === "current" && isRetainedEarningsRow(row)) {
          value = calculatedRetainedEarningsCurrent;
        } else {
          // Use formatted value (absolute) to match row display
          const rawValue = year === "current" ? row.finalBalance : row.priorYear;
          value = formatBalanceSheetValue(rawValue || 0, row.accountName);
        }
        // Round to whole number before summing
        return acc + Math.round(value || 0);
      }, 0);
      
      // Check if this is a contra-asset group4 (like "Accumulated Depreciation")
      // If all rows are contra-assets, the sum will be negative and should remain negative
      const isContraAssetGroup = group4.toLowerCase().includes("accumulated") ||
                                  group4.toLowerCase().includes("depreciation") ||
                                  group4.toLowerCase().includes("depn") ||
                                  groupedData[group1][group2][group3][group4].every(row => {
                                    const rawValue = year === "current" ? row.finalBalance : row.priorYear;
                                    return formatBalanceSheetValue(rawValue || 0, row.accountName) < 0;
                                  });
      
      // For contra-asset groups, keep negative; for others, ensure positive
      if (isContraAssetGroup) {
        return sum; // Keep negative for contra-asset groups
      }
      return sum < 0 ? -sum : sum;
    };

    const assetsCurrent = getGroup1Total("Assets", "current");
    const assetsPrior = getGroup1Total("Assets", "prior");

    const liabilitiesCurrent = getGroup1Total("Liabilities", "current");
    const liabilitiesPrior = getGroup1Total("Liabilities", "prior");

    const equityCurrent = getGroup1Total("Equity", "current");
    const equityPrior = getGroup1Total("Equity", "prior");

    // Balance check: Assets = Liabilities + Equity
    const balanceCurrent = assetsCurrent - (liabilitiesCurrent + equityCurrent);
    const balancePrior = assetsPrior - (liabilitiesPrior + equityPrior);

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

  // Helper to get the display value for a row (handles Retained Earnings calculation)
  const getRowCurrentYearValue = (row: ETBRow): number => {
    if (isRetainedEarningsRow(row)) {
      return calculations.calculatedRetainedEarningsCurrent;
    }
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

      // Define section order
      const sectionOrder = ["Assets", "Liabilities", "Equity"];

      sectionOrder.forEach((group1) => {
        if (!groupedData[group1]) return;

        // Add section header
        tableData.push([
          { content: group1.toUpperCase(), styles: { fontStyle: "bold", fontSize: 11, textColor: [0, 0, 0] } },
          "",
          "",
          "",
        ]);

        // Add group2 sections (exclude Current Year Profits & Losses from Equity)
        Object.entries(groupedData[group1])
          .filter(([group2]) => {
            // Exclude "Current Year Profits & Losses" from Equity
            if (group1 === "Equity" && group2 === "Current Year Profits & Losses") {
              return false;
            }
            return true;
          })
          .forEach(([group2, group3Map]) => {
            const currentTotal = calculations.getGroup2Total(
              group1,
              group2,
              "current"
            );
            const priorTotal = calculations.getGroup2Total(group1, group2, "prior");

            tableData.push([
              { content: group2, styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
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

            // Iterate through group3
            Object.entries(group3Map).forEach(([group3, group4Map]) => {
              const hasGroup3 = group3 !== "_direct_";

              // Add group3 header
              if (hasGroup3 && includeDetailRows) {
                const group3CurrentTotal = calculations.getGroup3Total(group1, group2, group3, "current");
                const group3PriorTotal = calculations.getGroup3Total(group1, group2, group3, "prior");
                
                tableData.push([
                  { content: `  ${group3}`, styles: { fontStyle: "italic", textColor: [0, 0, 0] } },
                  "",
                  {
                    content: formatValueForPDF(group3CurrentTotal),
                    styles: { fontStyle: "italic", halign: "right", textColor: [0, 0, 0] },
                  },
                  {
                    content: formatValueForPDF(group3PriorTotal),
                    styles: { fontStyle: "italic", halign: "right", textColor: [0, 0, 0] },
                  },
                ]);
              }

              // Iterate through group4
              Object.entries(group4Map).forEach(([group4, rows]) => {
                const hasGroup4 = group4 !== "_direct_";

                // Add group4 header
                if (hasGroup4 && includeDetailRows) {
                  const group4CurrentTotal = calculations.getGroup4Total(group1, group2, group3, group4, "current");
                  const group4PriorTotal = calculations.getGroup4Total(group1, group2, group3, group4, "prior");
                  
                  tableData.push([
                    { content: `    ${group4}`, styles: { fontSize: 8, textColor: [0, 0, 0] } },
                    "",
                    {
                      content: formatValueForPDF(group4CurrentTotal),
                      styles: { fontSize: 8, halign: "right", textColor: [0, 0, 0] },
                    },
                    {
                      content: formatValueForPDF(group4PriorTotal),
                      styles: { fontSize: 8, halign: "right", textColor: [0, 0, 0] },
                    },
                  ]);
                }

                // Add detail rows (only if includeDetailRows is true)
                if (includeDetailRows) {
                  const indent = hasGroup3 && hasGroup4 ? "      " : hasGroup3 || hasGroup4 ? "    " : "  ";
                  rows.forEach((row) => {
                    // Use calculated value for Retained Earnings current year
                    const currentYearValue = isRetainedEarningsRow(row) 
                      ? calculations.calculatedRetainedEarningsCurrent 
                      : formatBalanceSheetValue(row.finalBalance || 0, row.accountName);
                    const priorYearValue = formatBalanceSheetValue(row.priorYear || 0, row.accountName);
                    
                    tableData.push([
                      { content: `${indent}${row.accountName}`, styles: { textColor: [0, 0, 0] } },
                      { content: row.code || "", styles: { halign: "center", textColor: [0, 0, 0] } },
                      { content: formatValueForPDF(currentYearValue), styles: { halign: "right", textColor: [0, 0, 0] } },
                      { content: formatValueForPDF(priorYearValue), styles: { halign: "right", textColor: [0, 0, 0] } },
                    ]);
                  });
                }
              });
            });
          });

        // Add section total
        const currentTotal = calculations.getGroup1Total(group1, "current");
        const priorTotal = calculations.getGroup1Total(group1, "prior");

        tableData.push([
          {
            content: `Total ${group1}`,
            styles: { fontStyle: "bold", textColor: [0, 0, 0] },
          },
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

        // Add spacing
        tableData.push(["", "", "", ""]);
      });

      // Add Total Liabilities + Equity after Equity section
      tableData.push([
        {
          content: "Total Liabilities + Equity",
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
                  With TB Data (Detailed)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadPDF(false)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Without TB Data (Summary)
                </DropdownMenuItem>
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
                                          {formatTotalValue(
                                            calculations.getGroup3Total(
                                              "Equity",
                                              group2,
                                              group3,
                                              "current"
                                            )
                                          )}
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
                                                <div className="flex items-center justify-end gap-1">
                                                  {formatTableRowValue(getRowCurrentYearValue(row))}
                                                  {isRetainedEarningsRow(row) && (
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

