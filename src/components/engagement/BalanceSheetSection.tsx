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
    [grouping2: string]: ETBRow[];
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

      // Group by grouping1 and grouping2
      const grouped: GroupedRows = {};
      balanceSheetRows.forEach((row) => {
        const group1 = row.grouping1 || "Other";
        const group2 = row.grouping2 || "Other";

        if (!grouped[group1]) {
          grouped[group1] = {};
        }
        if (!grouped[group1][group2]) {
          grouped[group1][group2] = [];
        }
        grouped[group1][group2].push(row);
      });

      // Initialize all sections as expanded by default
      const initialExpanded: { [key: string]: boolean } = {};
      Object.entries(grouped).forEach(([group1, group2Map]) => {
        Object.keys(group2Map).forEach((group2) => {
          initialExpanded[`${group1}-${group2}`] = true;
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
      Object.keys(group2Map).forEach((group2) => {
        allExpanded[`${group1}-${group2}`] = true;
      });
    });
    setExpandedSections(allExpanded);
  };

  // Collapse all sections
  const collapseAll = () => {
    const allCollapsed: { [key: string]: boolean } = {};
    Object.entries(groupedData).forEach(([group1, group2Map]) => {
      Object.keys(group2Map).forEach((group2) => {
        allCollapsed[`${group1}-${group2}`] = false;
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
        .reduce((acc, [_, rows]) => {
          const sum = rows.reduce((rowAcc, row) => {
            const value = year === "current" ? row.currentYear : row.priorYear;
            return rowAcc + (value || 0);
          }, 0);
          return acc + sum;
        }, 0);
    };

    const getGroup2Total = (
      group1: string,
      group2: string,
      year: "current" | "prior"
    ): number => {
      if (!groupedData[group1] || !groupedData[group1][group2]) return 0;

      return groupedData[group1][group2].reduce((acc, row) => {
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
          .forEach(([group2, rows]) => {
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

            // Add detail rows (only if includeDetailRows is true)
            if (includeDetailRows) {
              rows.forEach((row) => {
                tableData.push([
                  `  ${row.accountName}`,
                  row.code || "",
                  formatCurrency(row.currentYear || 0),
                  formatCurrency(row.priorYear || 0),
                ]);
              });
            }
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
                          ([group2, rows]) => {
                            const sectionKey = `Assets-${group2}`;
                            const isExpanded = expandedSections[sectionKey];
                            
                            return (
                            <React.Fragment key={group2}>
                              {/* Group2 Header with Toggle */}
                              <tr 
                                className="bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                                onClick={() => toggleSection(sectionKey)}
                              >
                                <td className="p-3 font-semibold">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
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

                              {/* Detail Rows (only show if expanded) */}
                              {isExpanded && rows.map((row) => (
                                <tr
                                  key={row.id}
                                  className="border-b hover:bg-gray-50"
                                >
                                  <td className="p-3 pl-8 text-sm">
                                    {row.accountName}
                                  </td>
                                  <td className="p-3 text-sm text-gray-600">
                                    {row.code || ""}
                                  </td>
                                  <td className="p-3 text-right text-sm">
                                    {formatCurrency(row.currentYear || 0)}
                                  </td>
                                  <td className="p-3 text-right text-sm">
                                    {formatCurrency(row.priorYear || 0)}
                                  </td>
                                </tr>
                              ))}
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
                          ([group2, rows]) => {
                            const sectionKey = `Liabilities-${group2}`;
                            const isExpanded = expandedSections[sectionKey];
                            
                            return (
                            <React.Fragment key={group2}>
                              {/* Group2 Header with Toggle */}
                              <tr 
                                className="bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                                onClick={() => toggleSection(sectionKey)}
                              >
                                <td className="p-3 font-semibold">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
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

                              {/* Detail Rows (only show if expanded) */}
                              {isExpanded && rows.map((row) => (
                                <tr
                                  key={row.id}
                                  className="border-b hover:bg-gray-50"
                                >
                                  <td className="p-3 pl-8 text-sm">
                                    {row.accountName}
                                  </td>
                                  <td className="p-3 text-sm text-gray-600">
                                    {row.code || ""}
                                  </td>
                                  <td className="p-3 text-right text-sm">
                                    {formatCurrency(row.currentYear || 0)}
                                  </td>
                                  <td className="p-3 text-right text-sm">
                                    {formatCurrency(row.priorYear || 0)}
                                  </td>
                                </tr>
                              ))}
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
                          .map(([group2, rows]) => {
                            const sectionKey = `Equity-${group2}`;
                            const isExpanded = expandedSections[sectionKey];
                            
                            return (
                            <React.Fragment key={group2}>
                              {/* Group2 Header with Toggle */}
                              <tr 
                                className="bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                                onClick={() => toggleSection(sectionKey)}
                              >
                                <td className="p-3 font-semibold">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
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

                              {/* Detail Rows (only show if expanded) */}
                              {isExpanded && rows.map((row) => (
                                <tr
                                  key={row.id}
                                  className="border-b hover:bg-gray-50"
                                >
                                  <td className="p-3 pl-8 text-sm">
                                    {row.accountName}
                                  </td>
                                  <td className="p-3 text-sm text-gray-600">
                                    {row.code || ""}
                                  </td>
                                  <td className="p-3 text-right text-sm">
                                    {formatCurrency(row.currentYear || 0)}
                                  </td>
                                  <td className="p-3 text-right text-sm">
                                    {formatCurrency(row.priorYear || 0)}
                                  </td>
                                </tr>
                              ))}
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

