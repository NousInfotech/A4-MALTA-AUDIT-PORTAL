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
import { Loader2, Download, Scale, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClient } from "@/hooks/useClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
      const balanceSheetRows = etbRows.filter((row) => {
        if (!row.grouping1 || !row.grouping2) return false;
        // Exclude income statement rows
        if (
          row.grouping1 === "Equity" &&
          row.grouping2 === "Current Year Profits & Losses"
        ) {
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

  // Calculate totals
  const calculations = useMemo(() => {
    const getGroup1Total = (
      group1: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1]) return 0;

      return Object.entries(groupedData[group1])
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
                const value = year === "current" ? row.currentYear : row.priorYear;
                return rowAcc + (value || 0);
              }, 0);
              return g4Acc + rowSum;
            }, 0);
            return g3Acc + group4Sum;
          }, 0);
          return acc + group3Sum;
        }, 0);
    };

    const getGroup2Total = (
      group1: string,
      group2: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1] || !groupedData[group1][group2]) return 0;

      return Object.values(groupedData[group1][group2]).reduce((g3Acc, group4Map) => {
        const group4Sum = Object.values(group4Map).reduce((g4Acc, rows) => {
          const rowSum = rows.reduce((rowAcc, row) => {
            const value = year === "current" ? row.currentYear : row.priorYear;
            return rowAcc + (value || 0);
          }, 0);
          return g4Acc + rowSum;
        }, 0);
        return g3Acc + group4Sum;
      }, 0);
    };

    const getGroup3Total = (
      group1: string,
      group2: string,
      group3: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1] || !groupedData[group1][group2] || !groupedData[group1][group2][group3]) return 0;

      return Object.values(groupedData[group1][group2][group3]).reduce((g4Acc, rows) => {
        const rowSum = rows.reduce((rowAcc, row) => {
          const value = year === "current" ? row.currentYear : row.priorYear;
          return rowAcc + (value || 0);
        }, 0);
        return g4Acc + rowSum;
      }, 0);
    };

    const getGroup4Total = (
      group1: string,
      group2: string,
      group3: string,
      group4: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1] || !groupedData[group1][group2] || !groupedData[group1][group2][group3] || !groupedData[group1][group2][group3][group4]) return 0;

      return groupedData[group1][group2][group3][group4].reduce((acc, row) => {
        const value = year === "current" ? row.currentYear : row.priorYear;
        return acc + (value || 0);
      }, 0);
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
    };
  }, [groupedData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
          { content: group1.toUpperCase(), styles: { fontStyle: "bold", fontSize: 11 } },
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
              { content: group2, styles: { fontStyle: "bold" } },
              "",
              {
                content: formatCurrency(currentTotal),
                styles: { fontStyle: "bold" },
              },
              {
                content: formatCurrency(priorTotal),
                styles: { fontStyle: "bold" },
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
                  { content: `  ${group3}`, styles: { fontStyle: "italic" } },
                  "",
                  {
                    content: formatCurrency(group3CurrentTotal),
                    styles: { fontStyle: "italic" },
                  },
                  {
                    content: formatCurrency(group3PriorTotal),
                    styles: { fontStyle: "italic" },
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
                    { content: `    ${group4}`, styles: { fontSize: 8 } },
                    "",
                    {
                      content: formatCurrency(group4CurrentTotal),
                      styles: { fontSize: 8 },
                    },
                    {
                      content: formatCurrency(group4PriorTotal),
                      styles: { fontSize: 8 },
                    },
                  ]);
                }

                // Add detail rows (only if includeDetailRows is true)
                if (includeDetailRows) {
                  const indent = hasGroup3 && hasGroup4 ? "      " : hasGroup3 || hasGroup4 ? "    " : "  ";
                  rows.forEach((row) => {
                    tableData.push([
                      `${indent}${row.accountName}`,
                      row.code || "",
                      formatCurrency(row.currentYear || 0),
                      formatCurrency(row.priorYear || 0),
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
            styles: { fontStyle: "bold", fillColor: [251, 191, 36] },
          },
          "",
          {
            content: formatCurrency(currentTotal),
            styles: { fontStyle: "bold", fillColor: [251, 191, 36] },
          },
          {
            content: formatCurrency(priorTotal),
            styles: { fontStyle: "bold", fillColor: [251, 191, 36] },
          },
        ]);

        // Add spacing
        tableData.push(["", "", "", ""]);
      });

      // Add balance check
      tableData.push([
        {
          content: "Balance Check (Assets - Liabilities - Equity)",
          styles: { fontStyle: "bold", fillColor: calculations.balanceCurrent === 0 ? [187, 247, 208] : [254, 202, 202] },
        },
        "",
        {
          content: formatCurrency(calculations.balanceCurrent),
          styles: { fontStyle: "bold", fillColor: calculations.balanceCurrent === 0 ? [187, 247, 208] : [254, 202, 202] },
        },
        {
          content: formatCurrency(calculations.balancePrior),
          styles: { fontStyle: "bold", fillColor: calculations.balancePrior === 0 ? [187, 247, 208] : [254, 202, 202] },
        },
      ]);

      autoTable(doc, {
        startY: 45,
        head: [["Description", "Notes", currentYearLabel, priorYearLabel]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [251, 191, 36], textColor: [0, 0, 0] },
        styles: { fontSize: 9 },
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
                                  {formatCurrency(
                                    calculations.getGroup2Total(
                                      "Assets",
                                      group2,
                                      "current"
                                    )
                                  )}
                                </td>
                                <td className="p-3 text-right font-semibold">
                                  {formatCurrency(
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
                                          {formatCurrency(
                                            calculations.getGroup3Total(
                                              "Assets",
                                              group2,
                                              group3,
                                              "current"
                                            )
                                          )}
                                        </td>
                                        <td className="p-2 text-right text-sm font-medium">
                                          {formatCurrency(
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
                                                {formatCurrency(
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
                                                {formatCurrency(
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
                                                {formatCurrency(row.currentYear || 0)}
                                              </td>
                                              <td className="p-2 text-right text-xs">
                                                {formatCurrency(row.priorYear || 0)}
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
                            {formatCurrency(calculations.assetsCurrent)}
                          </td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatCurrency(calculations.assetsPrior)}
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
                                  {formatCurrency(
                                    calculations.getGroup2Total(
                                      "Liabilities",
                                      group2,
                                      "current"
                                    )
                                  )}
                                </td>
                                <td className="p-3 text-right font-semibold">
                                  {formatCurrency(
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
                                          {formatCurrency(
                                            calculations.getGroup3Total(
                                              "Liabilities",
                                              group2,
                                              group3,
                                              "current"
                                            )
                                          )}
                                        </td>
                                        <td className="p-2 text-right text-sm font-medium">
                                          {formatCurrency(
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
                                                {formatCurrency(
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
                                                {formatCurrency(
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
                                                {formatCurrency(row.currentYear || 0)}
                                              </td>
                                              <td className="p-2 text-right text-xs">
                                                {formatCurrency(row.priorYear || 0)}
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
                            {formatCurrency(calculations.liabilitiesCurrent)}
                          </td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatCurrency(calculations.liabilitiesPrior)}
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
                                  {formatCurrency(
                                    calculations.getGroup2Total(
                                      "Equity",
                                      group2,
                                      "current"
                                    )
                                  )}
                                </td>
                                <td className="p-3 text-right font-semibold">
                                  {formatCurrency(
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
                                          {formatCurrency(
                                            calculations.getGroup3Total(
                                              "Equity",
                                              group2,
                                              group3,
                                              "current"
                                            )
                                          )}
                                        </td>
                                        <td className="p-2 text-right text-sm font-medium">
                                          {formatCurrency(
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
                                                {formatCurrency(
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
                                                {formatCurrency(
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
                                                {formatCurrency(row.currentYear || 0)}
                                              </td>
                                              <td className="p-2 text-right text-xs">
                                                {formatCurrency(row.priorYear || 0)}
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
                            {formatCurrency(calculations.equityCurrent)}
                          </td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatCurrency(calculations.equityPrior)}
                          </td>
                        </tr>

                        {/* Total Liabilities + Equity */}
                        <tr className="bg-amber-200 border-t-2 border-amber-400">
                          <td className="p-3 font-bold text-lg">
                            Total Liabilities + Equity
                          </td>
                          <td className="p-3"></td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatCurrency(
                              calculations.liabilitiesCurrent +
                                calculations.equityCurrent
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-lg">
                            {formatCurrency(
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
                        Balance Check (Assets - Liabilities - Equity)
                      </td>
                      <td className="p-4"></td>
                      <td className="p-4 text-right font-bold text-lg">
                        {formatCurrency(calculations.balanceCurrent)}
                      </td>
                      <td className="p-4 text-right font-bold text-lg">
                        {formatCurrency(calculations.balancePrior)}
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

