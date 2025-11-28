// @ts-nocheck
import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Download, FileText, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp } from "lucide-react";
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

interface IncomeStatementSectionProps {
  engagement: any;
  etbRows: ETBRow[];
  financialYearStart?: string;
  financialYearEnd?: string;
}

interface GroupedRows {
  [grouping3: string]: {
    [grouping4: string]: ETBRow[];
  };
}

const GROUPING_ORDER = [
  "Revenue",
  "Cost of sales",
  "Sales and marketing expenses",
  "Administrative expenses",
  "Other operating income",
  "Investment income",
  "Investment losses",
  "Finance costs",
  "Share of profit of subsidiary",
  "PBT Expenses",
  "Income tax expense",
];

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

export const IncomeStatementSection: React.FC<IncomeStatementSectionProps> = ({
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

  // Get year labels from engagement or use defaults
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

  // Filter and group income statement rows
  useEffect(() => {
    const calculateData = async () => {
      setIsCalculating(true);

      // Simulate async calculation (allows UI to show loading state)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Filter rows for income statement (Equity > Current Year Profits & Losses)
      // Ensure groupings are extracted from classification if missing
      const incomeRows = etbRows
        .map(row => ensureRowGroupings(row))
        .filter(
          (row) =>
            row.grouping1 === "Equity" &&
            row.grouping2 === "Current Year Profits & Losses" &&
            row.grouping3
        );

      // Group by grouping3 and grouping4
      const grouped: GroupedRows = {};
      incomeRows.forEach((row) => {
        const group3 = row.grouping3 || "Other";
        const group4 = row.grouping4 || "_direct_"; // Use placeholder if no group4

        if (!grouped[group3]) {
          grouped[group3] = {};
        }
        if (!grouped[group3][group4]) {
          grouped[group3][group4] = [];
        }
        grouped[group3][group4].push(row);
      });

      // Initialize all sections as expanded by default
      const initialExpanded: { [key: string]: boolean } = {};
      Object.entries(grouped).forEach(([group3, group4Map]) => {
        initialExpanded[group3] = true;
        Object.keys(group4Map).forEach((group4) => {
          if (group4 !== "_direct_") {
            initialExpanded[`${group3}-${group4}`] = true;
          }
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
    Object.entries(groupedData).forEach(([group3, group4Map]) => {
      allExpanded[group3] = true;
      Object.keys(group4Map).forEach((group4) => {
        if (group4 !== "_direct_") {
          allExpanded[`${group3}-${group4}`] = true;
        }
      });
    });
    setExpandedSections(allExpanded);
  };

  // Collapse all sections
  const collapseAll = () => {
    const allCollapsed: { [key: string]: boolean } = {};
    Object.entries(groupedData).forEach(([group3, group4Map]) => {
      allCollapsed[group3] = false;
      Object.keys(group4Map).forEach((group4) => {
        if (group4 !== "_direct_") {
          allCollapsed[`${group3}-${group4}`] = false;
        }
      });
    });
    setExpandedSections(allCollapsed);
  };

  // Calculate subtotals
  const calculations = useMemo(() => {
    const getValue = (grouping3: string, year: "current" | "prior") => {
      const group4Map = groupedData[grouping3] || {};
      // Round each value before summing to match displayed rounded values
      const sum = Object.values(group4Map).reduce((g4Acc, rows) => {
        const rowSum = rows.reduce((acc, row) => {
          const value = year === "current" ? row.finalBalance : row.priorYear;
          // Round to whole number before summing
          return acc + Math.round(value || 0);
        }, 0);
        return g4Acc + rowSum;
      }, 0);
      const sign = GROUPING_SIGNS[grouping3] || "+";
      // For Income Statement display:
      // Revenue/Income items (sign = "+") should be positive: flip if negative
      // Expense items (sign = "-") should be negative: flip if positive
      if (sign === "+") {
        // Revenue/Income: ensure positive for display
        return sum < 0 ? -sum : sum;
      } else {
        // Expenses: ensure negative for display
        return sum > 0 ? -sum : sum;
      }
    };

    const getGroup4Total = (
      grouping3: string,
      grouping4: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[grouping3] || !groupedData[grouping3][grouping4]) return 0;

      const rows = groupedData[grouping3][grouping4];
      // Round each value before summing to match displayed rounded values
      const sum = rows.reduce((acc, row) => {
        const value = year === "current" ? row.finalBalance : row.priorYear;
        // Round to whole number before summing
        return acc + Math.round(value || 0);
      }, 0);
      const sign = GROUPING_SIGNS[grouping3] || "+";
      // For Income Statement display:
      // Revenue/Income items (sign = "+") should be positive: flip if negative
      // Expense items (sign = "-"): Group4 totals should match individual items display style
      //   - For most expenses: positive (absolute value) to match individual items
      //   - For Income tax expense: preserve original sign to handle credits vs expenses
      if (sign === "+") {
        // Revenue/Income: ensure positive for display
        return sum < 0 ? -sum : sum;
      } else {
        // For Income tax expense, preserve original signs (credits can be positive, expenses negative)
        if (grouping3 === "Income tax expense") {
          return sum; // Preserve original sign for tax items
        }
        // Other expenses: Group4 totals should be positive (absolute value) to match individual items
        return sum < 0 ? -sum : sum;
      }
    };

    // Gross Profit = Revenue - Cost of sales
    // Since Cost of sales is already negative, adding is equivalent to subtracting
    const grossProfitCurrent =
      getValue("Revenue", "current") + getValue("Cost of sales", "current");
    const grossProfitPrior =
      getValue("Revenue", "prior") + getValue("Cost of sales", "prior");

    // Operating Profit = Gross Profit - Operating Expenses
    // Since expenses are already negative, adding them to Gross Profit is correct
    const operatingProfitCurrent =
      grossProfitCurrent +
      getValue("Sales and marketing expenses", "current") +
      getValue("Administrative expenses", "current") +
      getValue("Other operating income", "current");
    const operatingProfitPrior =
      grossProfitPrior +
      getValue("Sales and marketing expenses", "prior") +
      getValue("Administrative expenses", "prior") +
      getValue("Other operating income", "prior");

    // Net Profit Before Tax = Operating Profit + Investment income + Investment losses + Finance costs + Share of profit + PBT Expenses
    // Since expenses are already negative, adding them is correct
    const netProfitBeforeTaxCurrent =
      operatingProfitCurrent +
      getValue("Investment income", "current") +
      getValue("Investment losses", "current") +
      getValue("Finance costs", "current") +
      getValue("Share of profit of subsidiary", "current") +
      getValue("PBT Expenses", "current");
    const netProfitBeforeTaxPrior =
      operatingProfitPrior +
      getValue("Investment income", "prior") +
      getValue("Investment losses", "prior") +
      getValue("Finance costs", "prior") +
      getValue("Share of profit of subsidiary", "prior") +
      getValue("PBT Expenses", "prior");

    // Net Profit After Tax = Net Profit Before Tax - Income tax expense
    // Since Income tax expense is already negative, adding it is equivalent to subtracting
    const netProfitAfterTaxCurrent =
      netProfitBeforeTaxCurrent + getValue("Income tax expense", "current");
    const netProfitAfterTaxPrior =
      netProfitBeforeTaxPrior + getValue("Income tax expense", "prior");

    return {
      getValue,
      getGroup4Total,
      grossProfitCurrent,
      grossProfitPrior,
      operatingProfitCurrent,
      operatingProfitPrior,
      netProfitBeforeTaxCurrent,
      netProfitBeforeTaxPrior,
      netProfitAfterTaxCurrent,
      netProfitAfterTaxPrior,
    };
  }, [groupedData]);

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
  const formatValueForPDF = (value: number, grouping3: string, isNegative: boolean = false): string => {
    // Round to whole number
    const roundedValue = Math.round(value);
    
    // Return "-" if value is zero
    if (roundedValue === 0) {
      return "-";
    }
    
    const sign = GROUPING_SIGNS[grouping3] || "+";
    let displayValue = value;
    let shouldShowInParentheses = false;
    
    // Apply sign conversion logic
    if (sign === "+") {
      // Revenue/Income: ensure positive for display
      displayValue = value < 0 ? -value : value;
      shouldShowInParentheses = false;
    } else {
      // For Income tax expense, preserve original signs
      if (grouping3 === "Income tax expense") {
        displayValue = value;
        // Show in parentheses only if negative (expense)
        shouldShowInParentheses = value < 0;
      } else {
        // Other expenses: convert to positive (absolute value) and show in parentheses
        displayValue = value < 0 ? -value : value;
        shouldShowInParentheses = true;
      }
    }
    
    // Round to whole number
    const finalRoundedValue = Math.round(displayValue);
    
    // Format with commas, no decimal places
    const formatted = new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(finalRoundedValue));
    
    // Show in parentheses if needed
    return shouldShowInParentheses ? `(${formatted})` : formatted;
  };

  // Helper function to format individual row values with correct sign for Income Statement display
  const formatRowValue = (value: number, grouping3: string): number => {
    const sign = GROUPING_SIGNS[grouping3] || "+";
    // For Income Statement display:
    // Revenue/Income items (sign = "+") should be positive: flip if negative
    // Expense items (sign = "-"): 
    //   - For most expenses: Individual line items should be positive (absolute value)
    //   - For Income tax expense: Preserve original sign to handle credits vs expenses correctly
    if (sign === "+") {
      // Revenue/Income: ensure positive for display
      return value < 0 ? -value : value;
    } else {
      // For Income tax expense, preserve original signs (credits can be positive, expenses negative)
      if (grouping3 === "Income tax expense") {
        return value; // Preserve original sign for tax items
      }
      // Other expenses: Individual line items should be positive (absolute value)
      // This is standard practice - individual costs shown as positive, totals as negative
      return value < 0 ? -value : value;
    }
  };

  // Format table row values: rounded to whole numbers, with parentheses for negative (expenses)
  const formatTableRowValue = (value: number, grouping3: string): string => {
    const sign = GROUPING_SIGNS[grouping3] || "+";
    let displayValue = value;
    let shouldShowInParentheses = false;
    
    // Apply sign conversion logic
    if (sign === "+") {
      // Revenue/Income: ensure positive for display
      displayValue = value < 0 ? -value : value;
      shouldShowInParentheses = false;
    } else {
      // For Income tax expense, preserve original signs
      if (grouping3 === "Income tax expense") {
        displayValue = value;
        // Show in parentheses only if negative (expense)
        shouldShowInParentheses = value < 0;
      } else {
        // Other expenses: convert to positive (absolute value) and show in parentheses
        displayValue = value < 0 ? -value : value;
        shouldShowInParentheses = true;
      }
    }
    
    // Round to whole number
    const roundedValue = Math.round(displayValue);
    
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
    
    // Show in parentheses if needed
    return shouldShowInParentheses ? `(${formatted})` : formatted;
  };

  // Format totals (profit/loss values): rounded to whole numbers, no parentheses
  const formatTotalValue = (value: number): string => {
    // Round to whole number
    const roundedValue = Math.round(value);
    
    // Return "-" if value is zero
    if (roundedValue === 0) {
      return "-";
    }
    
    // Format with commas, no decimal places
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(roundedValue);
  };

  const downloadPDF = (includeDetailRows: boolean = true) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Income Statement", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(
        client?.company_name || engagement?.clientName || "Client Name",
        pageWidth / 2,
        28,
        { align: "center" }
      );
      doc.text(
        `For the year ended ${currentYearLabel}`,
        pageWidth / 2,
        35,
        { align: "center" }
      );

      // Table data
      const tableData: any[] = [];

      // Determine which sections have data for subtotals
      const operatingSections = ["Sales and marketing expenses", "Administrative expenses", "Other operating income"];
      const lastOperatingSection = operatingSections.reverse().find(section => groupedData[section] && Object.keys(groupedData[section]).length > 0);
      const netProfitSections = ["Investment income", "Investment losses", "Finance costs", "Share of profit of subsidiary", "PBT Expenses"];
      const lastNetProfitSection = netProfitSections.reverse().find(section => groupedData[section] && Object.keys(groupedData[section]).length > 0);

      // Add each grouping in order with subtotals
      GROUPING_ORDER.forEach((grouping3) => {
        if (groupedData[grouping3] && Object.keys(groupedData[grouping3]).length > 0) {
          const currentValue = calculations.getValue(grouping3, "current");
          const priorValue = calculations.getValue(grouping3, "prior");

          // Add grouping3 header
          tableData.push([
            { content: grouping3, styles: { textColor: [0, 0, 0] } },
            "",
            { content: formatValueForPDF(currentValue, grouping3), styles: { halign: "right", textColor: [0, 0, 0] } },
            { content: formatValueForPDF(priorValue, grouping3), styles: { halign: "right", textColor: [0, 0, 0] } },
          ]);

          // Iterate through group4
          if (includeDetailRows) {
            Object.entries(groupedData[grouping3]).forEach(([group4, rows]) => {
              const hasGroup4 = group4 !== "_direct_";

              // Add group4 header if it exists
              if (hasGroup4) {
                const group4Current = calculations.getGroup4Total(grouping3, group4, "current");
                const group4Prior = calculations.getGroup4Total(grouping3, group4, "prior");
                
                tableData.push([
                  { content: `  ${group4}`, styles: { fontStyle: "italic", textColor: [0, 0, 0] } },
                  "",
                  {
                    content: formatValueForPDF(group4Current, grouping3),
                    styles: { fontStyle: "italic", halign: "right", textColor: [0, 0, 0] },
                  },
                  {
                    content: formatValueForPDF(group4Prior, grouping3),
                    styles: { fontStyle: "italic", halign: "right", textColor: [0, 0, 0] },
                  },
                ]);
              }

              // Add detail rows
              const indent = hasGroup4 ? "    " : "  ";
              rows.forEach((row) => {
                tableData.push([
                  { content: `${indent}${row.accountName}`, styles: { textColor: [0, 0, 0] } },
                  { content: row.code || "", styles: { halign: "center", textColor: [0, 0, 0] } },
                  { content: formatValueForPDF(row.finalBalance || 0, grouping3), styles: { halign: "right", textColor: [0, 0, 0] } },
                  { content: formatValueForPDF(row.priorYear || 0, grouping3), styles: { halign: "right", textColor: [0, 0, 0] } },
                ]);
              });
            });
          }

          // Add Gross Profit after Cost of sales (only if BOTH Revenue and Cost of sales exist)
          if (grouping3 === "Cost of sales" && 
              groupedData["Revenue"] && 
              Object.keys(groupedData["Revenue"]).length > 0 && 
              groupedData["Cost of sales"] && 
              Object.keys(groupedData["Cost of sales"]).length > 0) {
            tableData.push([
              { content: "Gross Profit", styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
              "",
              {
                content: formatCurrencyForPDF(calculations.grossProfitCurrent),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
              {
                content: formatCurrencyForPDF(calculations.grossProfitPrior),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
            ]);
          }

          // Add Operating Profit after last operating section
          if (grouping3 === lastOperatingSection) {
            tableData.push([
              { content: "Operating Profit", styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
              "",
              {
                content: formatCurrencyForPDF(calculations.operatingProfitCurrent),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
              {
                content: formatCurrencyForPDF(calculations.operatingProfitPrior),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
            ]);
          }

          // Add Net Profit Before Tax after last net profit section
          if (grouping3 === lastNetProfitSection) {
            tableData.push([
              { content: "Net Profit Before Tax", styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
              "",
              {
                content: formatCurrencyForPDF(calculations.netProfitBeforeTaxCurrent),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
              {
                content: formatCurrencyForPDF(calculations.netProfitBeforeTaxPrior),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
            ]);
          }

          // Add Net Profit After Tax after Income tax expense
          if (grouping3 === "Income tax expense") {
            tableData.push([
              { content: "Net Profit After Tax", styles: { fontStyle: "bold", textColor: [0, 0, 0] } },
              "",
              {
                content: formatCurrencyForPDF(calculations.netProfitAfterTaxCurrent),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
              {
                content: formatCurrencyForPDF(calculations.netProfitAfterTaxPrior),
                styles: { fontStyle: "bold", halign: "right", textColor: [0, 0, 0], lineWidth: { top: 0.2, bottom: 0.5 }, lineColor: [0, 0, 0] },
              },
            ]);
          }
        }
      });

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
        ? `Income_Statement_Detailed_${client?.company_name || engagement?.clientName || "Client"}_${currentYearLabel}.pdf`
        : `Income_Statement_Summary_${client?.company_name || engagement?.clientName || "Client"}_${currentYearLabel}.pdf`;
      
      doc.save(fileName);

      toast({
        title: "Success",
        description: "Income Statement PDF downloaded successfully",
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
          <p className="text-gray-600">Calculating Income Statement...</p>
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
              <FileText className="h-6 w-6" />
              Income Statement
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {clientLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading client...
                </span>
              ) : (
                <>
                  {client?.company_name || engagement?.clientName || "Client Name"} • For the year ended{" "}
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-amber-100 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold">Description</th>
                    <th className="text-left p-3 font-semibold w-24">Notes</th>
                    <th className="text-right p-3 font-semibold w-32">
                      {currentYearLabel}
                    </th>
                    <th className="text-right p-3 font-semibold w-32">
                      {priorYearLabel}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Determine which sections have data
                    const operatingSections = ["Sales and marketing expenses", "Administrative expenses", "Other operating income"];
                    const lastOperatingSection = operatingSections.reverse().find(section => groupedData[section] && Object.keys(groupedData[section]).length > 0);
                    const netProfitSections = ["Investment income", "Investment losses", "Finance costs", "Share of profit of subsidiary", "PBT Expenses"];
                    const lastNetProfitSection = netProfitSections.reverse().find(section => groupedData[section] && Object.keys(groupedData[section]).length > 0);

                    return GROUPING_ORDER.map((grouping3, idx) => {
                      const group4Map = groupedData[grouping3];
                      if (!group4Map || Object.keys(group4Map).length === 0) return null;

                      const currentValue = calculations.getValue(
                        grouping3,
                        "current"
                      );
                      const priorValue = calculations.getValue(grouping3, "prior");

                      const showOperatingProfit = grouping3 === lastOperatingSection;
                      const showNetProfitBeforeTax = grouping3 === lastNetProfitSection;

                      const isGroup3Expanded = expandedSections[grouping3];

                      return (
                        <React.Fragment key={grouping3}>
                          {/* Grouping3 Header with Toggle */}
                          <tr 
                            className="bg-gray-50 border-t-2 border-gray-300 cursor-pointer hover:bg-gray-100"
                            onClick={() => toggleSection(grouping3)}
                          >
                            <td className="p-3 font-semibold">
                              <div className="flex items-center gap-2">
                                {isGroup3Expanded ? (
                                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                )}
                                <span>{grouping3}</span>
                              </div>
                            </td>
                            <td className="p-3"></td>
                            <td className="p-3 text-right font-semibold">
                              {formatTableRowValue(currentValue, grouping3)}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {formatTableRowValue(priorValue, grouping3)}
                            </td>
                          </tr>

                          {/* Group4 level and rows */}
                          {isGroup3Expanded && Object.entries(group4Map).map(([group4, rows]) => {
                            const hasGroup4 = group4 !== "_direct_";
                            const group4Key = `${grouping3}-${group4}`;
                            const isGroup4Expanded = expandedSections[group4Key];

                            return (
                              <React.Fragment key={group4}>
                                {/* Group4 Header (only if not direct) */}
                                {hasGroup4 && (
                                  <tr 
                                    className="bg-gray-100 border-t cursor-pointer hover:bg-gray-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSection(group4Key);
                                    }}
                                  >
                                    <td className="p-2 pl-8 font-medium text-sm">
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
                                    <td className="p-2 text-right text-sm font-medium">
                                      {formatTableRowValue(
                                        calculations.getGroup4Total(grouping3, group4, "current"),
                                        grouping3
                                      )}
                                    </td>
                                    <td className="p-2 text-right text-sm font-medium">
                                      {formatTableRowValue(
                                        calculations.getGroup4Total(grouping3, group4, "prior"),
                                        grouping3
                                      )}
                                    </td>
                                  </tr>
                                )}

                                {/* Detail Rows (only show if group4 expanded or no group4) */}
                                {(!hasGroup4 || isGroup4Expanded) && rows.map((row) => (
                                  <tr
                                    key={row.id}
                                    className="border-b hover:bg-gray-50"
                                  >
                                    <td className={`p-2 ${hasGroup4 ? 'pl-12' : 'pl-8'} text-xs`}>
                                      {row.accountName}
                                    </td>
                                    <td className="p-2 text-xs text-gray-600">
                                      {row.code || ""}
                                    </td>
                                    <td className="p-2 text-right text-xs">
                                      {formatTableRowValue(row.finalBalance || 0, grouping3)}
                                    </td>
                                    <td className="p-2 text-right text-xs">
                                      {formatTableRowValue(row.priorYear || 0, grouping3)}
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}

                          {/* Add subtotals after specific groupings */}
                          {/* Only show Gross Profit if BOTH Revenue AND Cost of sales exist */}
                          {grouping3 === "Cost of sales" && 
                            groupedData["Revenue"] && 
                            Object.keys(groupedData["Revenue"]).length > 0 && 
                            groupedData["Cost of sales"] && 
                            Object.keys(groupedData["Cost of sales"]).length > 0 && (
                            <tr className="bg-amber-50 border-t border-b-2 border-amber-300">
                              <td className="p-3 font-bold">Gross Profit</td>
                              <td className="p-3"></td>
                              <td className="p-3 text-right font-bold">
                                {formatTotalValue(calculations.grossProfitCurrent)}
                              </td>
                              <td className="p-3 text-right font-bold">
                                {formatTotalValue(calculations.grossProfitPrior)}
                              </td>
                            </tr>
                          )}

                          {showOperatingProfit && (
                            <tr className="bg-blue-50 border-t border-b-2 border-blue-300">
                              <td className="p-3 font-bold">Operating Profit</td>
                              <td className="p-3"></td>
                              <td className="p-3 text-right font-bold">
                                {formatTotalValue(
                                  calculations.operatingProfitCurrent
                                )}
                              </td>
                              <td className="p-3 text-right font-bold">
                                {formatTotalValue(calculations.operatingProfitPrior)}
                              </td>
                            </tr>
                          )}

                          {showNetProfitBeforeTax && (
                            <tr className="bg-purple-50 border-t border-b-2 border-purple-300">
                              <td className="p-3 font-bold">
                                Net Profit Before Tax
                              </td>
                              <td className="p-3"></td>
                              <td className="p-3 text-right font-bold">
                                {formatTotalValue(
                                  calculations.netProfitBeforeTaxCurrent
                                )}
                              </td>
                              <td className="p-3 text-right font-bold">
                                {formatTotalValue(
                                  calculations.netProfitBeforeTaxPrior
                                )}
                              </td>
                            </tr>
                          )}

                          {grouping3 === "Income tax expense" && (
                            <tr className="bg-green-50 border-t border-b-2 border-green-300">
                              <td className="p-3 font-bold">
                                Net Profit After Tax
                              </td>
                              <td className="p-3"></td>
                              <td className="p-3 text-right font-bold">
                                {formatTotalValue(
                                  calculations.netProfitAfterTaxCurrent
                                )}
                              </td>
                              <td className="p-3 text-right font-bold">
                                {formatTotalValue(
                                  calculations.netProfitAfterTaxPrior
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

