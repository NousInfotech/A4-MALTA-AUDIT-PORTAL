"use client";
import React, { useMemo, useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

type Person = {
  _id: string;
  name: string;
  roles?: string[];
  sharePercentage?: number;
};

type PerShareValue = {
  value: number;
  currency: string;
};

type ShareholdingCompany = {
  companyId: string | {
    _id: string;
    name: string;
    registrationNumber?: string;
  };
  // sharePercentage at the shareHoldingCompany level
  sharePercentage?: number;
  // sharesData is now an array
  authroizedShares?: number;
  issuedShares?: number;
  perShareValue?: PerShareValue;
  sharesData?: Array<{
    totalShares: number;
    class: string;
    type: string;
  }>;
};

interface SharePieChartProps {
  persons?: Person[];
  companies?: ShareholdingCompany[];
  title?: string;
  dateRangeLabel?: string;
  companyTotalShares?: number; // Total shares of the company for percentage calculation
  companyTotalSharesArray?: Array<{ totalShares: number; class: string; type: string }>; // Array to determine share class structure
  authorizedShares?: number;
  issuedShares?: number;
}

const COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#e11d48",
  "#06b6d4",
  "#84cc16",
];

type ChartData = {
  normalizedData: Array<{ name: string; value: number; totalShares?: number; type?: string }>;
  totalRaw: number;
  companyTotal: number;
  personTotal: number;
  personTotalShares: number;
  companyTotalShares: number;
  totalSharesSum: number;
  currentClassTotal: number;
};

const SharePieChart: React.FC<SharePieChartProps> = ({
  persons = [],
  companies = [],
  title = "Shareholders",
  dateRangeLabel = "",
  companyTotalShares = 0,
  companyTotalSharesArray = [],
  authorizedShares = 0,
  issuedShares = 0,
}) => {
  // Get total shares for a specific class from companyTotalSharesArray
  const getClassTotal = (shareClass: string): number => {
    if (!Array.isArray(companyTotalSharesArray)) return 0;
    const item = companyTotalSharesArray.find(s => s.class === shareClass);
    return item ? Number(item.totalShares) || 0 : 0;
  };

  // Get available share classes from companyTotalSharesArray
  const availableClasses = useMemo(() => {
    if (!Array.isArray(companyTotalSharesArray) || companyTotalSharesArray.length === 0) {
      return [];
    }
    return companyTotalSharesArray
      .map(item => item.class)
      .filter((class_, index, self) => self.indexOf(class_) === index)
      .sort((a, b) => {
        // Sort: Ordinary first, then A, B, C
        const order = {  "A": 0, "B": 1, "C": 2, "Ordinary": 3, };
        return (order[a as keyof typeof order] ?? 99) - (order[b as keyof typeof order] ?? 99);
      });
  }, [companyTotalSharesArray]);

  // State to track which view is selected (default to "total")
  const [selectedView, setSelectedView] = useState<string>("authorized");

  // Calculate data for all available classes
  const chartsData = useMemo(() => {
    // Helper to filter shares by class
    const filterSharesByClass = (sharesData: any[], classFilter: string): number => {
      if (!Array.isArray(sharesData)) return 0;
      return sharesData
        .filter(item => item.class === classFilter)
        .reduce((sum, item) => sum + (Number(item.totalShares) || 0), 0);
    };

    // Calculate chart data for a specific share class
    const calculateChartData = (shareClass: string): ChartData => {
      const currentTotal = getClassTotal(shareClass);

      // Process persons
      const personData = (persons || [])
        .map((p: any) => {
          const totalShares = filterSharesByClass(p?.sharesData || [], shareClass);
          
          let percentage = 0;
          if (totalShares > 0 && currentTotal > 0) {
            percentage = (totalShares / currentTotal) * 100;
          } else if (totalShares === 0 && currentTotal === 0 && shareClass === "Ordinary") {
            // Fallback for Ordinary shares if no sharesData
            percentage = Number(p?.sharePercentage ?? 0);
          }
          
          return {
            name: p?.name || "Unnamed",
            value: percentage,
            totalShares: totalShares,
            type: "Person",
          };
        })
        .filter((d) => !isNaN(d.value) && d.value > 0);

      // Process companies
      const companyData = (companies || [])
        .map((share: any) => {
          let companyName = "Unknown Company";
          if (share.companyId) {
            if (typeof share.companyId === 'object' && share.companyId.name) {
              companyName = share.companyId.name;
            } else if (typeof share.companyId === 'string') {
              companyName = "Unknown Company";
            }
          }
          
          const totalShares = filterSharesByClass(share?.sharesData || [], shareClass);
          
          let percentage = 0;
          if (totalShares > 0 && currentTotal > 0) {
            percentage = (totalShares / currentTotal) * 100;
          } else if (totalShares === 0 && currentTotal === 0 && shareClass === "Ordinary") {
            // Fallback for Ordinary shares if no sharesData
            percentage = Number(share?.sharePercentage ?? 0);
          }
          
          return {
            name: companyName,
            value: percentage,
            totalShares: totalShares,
            type: "Company",
          };
        })
        .filter((d) => !isNaN(d.value) && d.value > 0);

      // Combine both
      const raw = [...personData, ...companyData];

      const personSum = personData.reduce((acc, d) => acc + d.value, 0);
      const companySum = companyData.reduce((acc, d) => acc + d.value, 0);
      const sum = raw.reduce((acc, d) => acc + d.value, 0);
      
      // Calculate total shares for persons and companies
      const personTotalShares = personData.reduce((acc, d) => acc + (d.totalShares || 0), 0);
      const companySharesTotal = companyData.reduce((acc, d) => acc + (d.totalShares || 0), 0);
      const totalSharesSum = personTotalShares + companySharesTotal;

      if (sum <= 0) return { 
        normalizedData: [], 
        totalRaw: 0, 
        companyTotal: 0, 
        personTotal: 0,
        personTotalShares: 0,
        companyTotalShares: 0,
        totalSharesSum: 0,
        currentClassTotal: currentTotal,
      };

      let parts: { name: string; value: number; totalShares?: number; type?: string }[];
      if (sum > 100) {
        const scale = 100 / sum;
        parts = raw.map((d) => ({ 
          name: d.name, 
          value: d.value * scale, 
          totalShares: d.totalShares,
          type: d.type 
        }));
      } else {
        parts = [...raw];
        const remaining = Math.max(0, 100 - sum);
        if (remaining > 0.0001) {
          // Calculate remaining shares based on remaining percentage
          const remainingShares = currentTotal > 0 
            ? Math.round((remaining / 100) * currentTotal)
            : 0;
          parts.push({ 
            name: "Remaining Shares", 
            value: remaining,
            totalShares: remainingShares
          });
        }
      }

      return { 
        normalizedData: parts, 
        totalRaw: sum,
        companyTotal: companySum,
        personTotal: personSum,
        personTotalShares: personTotalShares,
        companyTotalShares: companySharesTotal,
        totalSharesSum: totalSharesSum,
        currentClassTotal: currentTotal,
      };
    };

    return availableClasses.map(shareClass => ({
      shareClass,
      data: calculateChartData(shareClass),
    })).filter(item => item.data.currentClassTotal > 0); // Only show charts with data
  }, [persons, companies, companyTotalShares, companyTotalSharesArray, availableClasses]);

  // Calculate total view data (all classes combined)
  const totalViewData = useMemo(() => {
    // Helper to filter shares by all classes
    const filterAllShares = (sharesData: any[]): number => {
      if (!Array.isArray(sharesData)) return 0;
      return sharesData
        .filter(item => availableClasses.includes(item.class))
        .reduce((sum, item) => sum + (Number(item.totalShares) || 0), 0);
    };

    // Get total of all classes
    const currentTotal = availableClasses.reduce((sum, shareClass) => {
      return sum + getClassTotal(shareClass);
    }, 0);

    // Process persons
    const personData = (persons || [])
      .map((p: any) => {
        const totalShares = filterAllShares(p?.sharesData || []);
        
        let percentage = 0;
        if (totalShares > 0 && currentTotal > 0) {
          percentage = (totalShares / currentTotal) * 100;
        }
        
        return {
          name: p?.name || "Unnamed",
          value: percentage,
          totalShares: totalShares,
          type: "Person",
        };
      })
      .filter((d) => !isNaN(d.value) && d.value > 0);

    // Process companies
    const companyData = (companies || [])
      .map((share: any) => {
        let companyName = "Unknown Company";
        if (share.companyId) {
          if (typeof share.companyId === 'object' && share.companyId.name) {
            companyName = share.companyId.name;
          } else if (typeof share.companyId === 'string') {
            companyName = "Unknown Company";
          }
        }
        
        const totalShares = filterAllShares(share?.sharesData || []);
        
        let percentage = 0;
        if (totalShares > 0 && currentTotal > 0) {
          percentage = (totalShares / currentTotal) * 100;
        }
        
        return {
          name: companyName,
          value: percentage,
          totalShares: totalShares,
          type: "Company",
        };
      })
      .filter((d) => !isNaN(d.value) && d.value > 0);

    // Combine both
    const raw = [...personData, ...companyData];

    const personSum = personData.reduce((acc, d) => acc + d.value, 0);
    const companySum = companyData.reduce((acc, d) => acc + d.value, 0);
    const sum = raw.reduce((acc, d) => acc + d.value, 0);
    
    // Calculate total shares for persons and companies
    const personTotalShares = personData.reduce((acc, d) => acc + (d.totalShares || 0), 0);
    const companySharesTotal = companyData.reduce((acc, d) => acc + (d.totalShares || 0), 0);
    const totalSharesSum = personTotalShares + companySharesTotal;

    if (sum <= 0) return { 
      normalizedData: [], 
      totalRaw: 0, 
      companyTotal: 0, 
      personTotal: 0,
      personTotalShares: 0,
      companyTotalShares: 0,
      totalSharesSum: 0,
      currentClassTotal: currentTotal,
    };

    let parts: { name: string; value: number; totalShares?: number; type?: string }[];
    if (sum > 100) {
      const scale = 100 / sum;
      parts = raw.map((d) => ({ 
        name: d.name, 
        value: d.value * scale, 
        totalShares: d.totalShares,
        type: d.type 
      }));
    } else {
      parts = [...raw];
      const remaining = Math.max(0, 100 - sum);
      if (remaining > 0.0001) {
        const remainingShares = currentTotal > 0 
          ? Math.round((remaining / 100) * currentTotal)
          : 0;
        parts.push({ 
          name: "Remaining Shares", 
          value: remaining,
          totalShares: remainingShares
        });
      }
    }

    return { 
      normalizedData: parts, 
      totalRaw: sum,
      companyTotal: companySum,
      personTotal: personSum,
      personTotalShares: personTotalShares,
      companyTotalShares: companySharesTotal,
      totalSharesSum: totalSharesSum,
      currentClassTotal: currentTotal,
    };
  }, [persons, companies, companyTotalShares, companyTotalSharesArray, availableClasses]);

  // Calculate Classes view data (Distribution of shares by class)
  const classesViewData = useMemo(() => {
    if (!Array.isArray(companyTotalSharesArray) || companyTotalSharesArray.length === 0) {
      return {
        normalizedData: [],
        totalRaw: 0,
        companyTotal: 0,
        personTotal: 0,
        personTotalShares: 0,
        companyTotalShares: 0,
        totalSharesSum: 0,
        currentClassTotal: 0,
      };
    }

    const totalSharesAll = companyTotalSharesArray.reduce((acc, item) => acc + (Number(item.totalShares) || 0), 0);

    const normalizedData = companyTotalSharesArray
      .filter(item => Number(item.totalShares) > 0)
      .map(item => ({
        name: item.class === "Ordinary" ? "Ordinary Shares" : `Class ${item.class}`,
        value: totalSharesAll > 0 ? (Number(item.totalShares) / totalSharesAll) * 100 : 0,
        totalShares: Number(item.totalShares),
        type: "Class"
      }))
      .sort((a, b) => b.value - a.value); // Sort by biggest share class

    return {
      normalizedData,
      totalRaw: 100,
      companyTotal: 0,
      personTotal: 0,
      personTotalShares: 0,
      companyTotalShares: 0,
      totalSharesSum: totalSharesAll,
      currentClassTotal: totalSharesAll,
    };
  }, [companyTotalSharesArray]);

  // Helper function to format class label
  const getClassLabel = (shareClass: string): string => {
    if (shareClass === "Ordinary") return "Ordinary Shares";
    if (shareClass === "classes") return "Share Class Distribution";
    return `Class ${shareClass} Shares`;
  };

  // Render a single pie chart component
  const renderPieChart = (shareClass: string, chartData: ChartData, customLabel?: string) => {
    const { normalizedData, totalRaw, companyTotal, personTotal, personTotalShares, companyTotalShares: companySharesTotal, totalSharesSum, currentClassTotal } = chartData;
    const classLabel = customLabel || getClassLabel(shareClass);

    return (
      <div key={shareClass} className="w-full bg-white border border-border rounded-2xl text-brand-text p-4 sm:p-5 md:p-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 w-full mb-4">
          <h5 className="text-lg sm:text-xl font-semibold break-words">
            {classLabel}
          </h5>
          {dateRangeLabel && (
            <div className="text-sm sm:text-base font-medium text-brand-text">
              {dateRangeLabel}
            </div>
          )}
        </div>

        {/* Chart Section */}
        <div className="py-4 sm:py-6" id={`pie-chart-${shareClass}`}>
          <div className="relative h-60 sm:h-72 md:h-96 w-full flex items-center justify-center">
            {normalizedData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                  <Pie
                    data={normalizedData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    label={(entry) => {
                      const percentage = Number(entry.value).toFixed(0);
                      const shares = entry.totalShares ? ` (${Number(entry.totalShares).toLocaleString()} shares)` : '';
                      return `${entry.name}: ${percentage}%${shares}`;
                    }}
                    isAnimationActive
                    className="capitalize"
                  >
                    {normalizedData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === "Remaining Shares"
                            ? "#9ca3af"
                            : COLORS[index % COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, props: any) => [
                      `${Number(val).toFixed(1)}%`,
                      `${props.payload?.type || ""} ${name}`.trim(),
                    ]}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{
                      fontSize: "0.8rem",
                      whiteSpace: "normal",
                      textAlign: "center",
                      lineHeight: "1.2rem",
                      paddingTop: "6px",
                      textTransform: "capitalize",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xl md:text-3xl text-gray-600">
                No share percentage data available
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <div className="text-center sm:text-left space-y-1">
            <p className="text-base sm:text-lg">
              Total declared {shareClass === "classes" ? "SHARES" : classLabel.toUpperCase()}:{" "}
              <span className="font-bold">{shareClass === "classes" ? "100%" : `${totalRaw.toFixed(0)}%`}</span>
              {totalSharesSum > 0 && (
                <span className="text-gray-600 ml-2">
                  ({totalSharesSum.toLocaleString()} out of {currentClassTotal.toLocaleString()} shares
                  {shareClass === "authorized" &&
                    ` - ${(
                      (totalSharesSum / currentClassTotal) *
                      100
                    ).toFixed(0)}% Issued`}
                  )
                </span>
              )}
            </p>
            {shareClass !== "classes" && (companyTotal > 0 || personTotal > 0) && (
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-gray-600">
                {companyTotal > 0 && (
                  <span>
                    Company shares: <span className="font-semibold text-gray-900">{companyTotal.toFixed(0)}%</span>
                    {companySharesTotal > 0 && (
                      <span className="ml-1">({companySharesTotal.toLocaleString()} shares)</span>
                    )}
                  </span>
                )}
                {personTotal > 0 && (
                  <span>
                    Person shares: <span className="font-semibold text-gray-900">{personTotal.toFixed(0)}%</span>
                    {personTotalShares > 0 && (
                      <span className="ml-1">({personTotalShares.toLocaleString()} shares)</span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper function to format class label for buttons
  const getClassButtonLabel = (shareClass: string): string => {
    if (shareClass === "Ordinary") return "Ordinary Share";
    if (shareClass === "total") return "Issued Share"; // Fixed label to match UI
    if (shareClass === "authorized") return "Authorized";
    if (shareClass === "classes") return "Classes";
    return `Class ${shareClass} Share`;
  };

  // Get the currently selected chart data
  const getCurrentChartData = (): { shareClass: string; data: ChartData; label: string } | null => {
    if (selectedView === "total") {
      return {
        shareClass: "total",
        data: totalViewData,
        label: "Issued Shares Breakdown"
      };
    }
    
    if (selectedView === "classes") {
      return {
        shareClass: "classes",
        data: classesViewData,
        label: "Share Class Distribution"
      };
    }
    
    if (selectedView === "authorized") {
      // Calculate Authorized vs Issued
      // Use explicit issuedShares if provided, otherwise fallback to companyTotalShares
      const issued = issuedShares > 0 ? issuedShares : companyTotalShares;
      const unissued = Math.max(0, authorizedShares - issued);
      const total = Math.max(issued + unissued, 1); // Avoid division by zero
      
      const issuedPercentage = (issued / authorizedShares) * 100;

      const authorizedData: ChartData = {
        normalizedData: [],
        totalRaw: 100,
        companyTotal: 0,
        personTotal: 0,
        personTotalShares: 0,
        companyTotalShares: 0,
        totalSharesSum: issued,
        currentClassTotal: authorizedShares,
      };

      if (authorizedShares > 0) {
        authorizedData.normalizedData = [
          {
            name: "Issued Shares",
            value: (issued / authorizedShares) * 100,
            totalShares: issued,
            type: "Status"
          },
          {
            name: "Remaining Shares",
            value: (unissued / authorizedShares) * 100,
            totalShares: unissued,
            type: "Status"
          }
        ].filter(d => d.value > 0);
      }

      return {
        shareClass: "authorized",
        data: authorizedData,
        label: "Authorized Share"
      };
    }
    
    const chartItem = chartsData.find(item => item.shareClass === selectedView);
    if (chartItem) {
      return {
        shareClass: chartItem.shareClass,
        data: chartItem.data,
        label: getClassLabel(chartItem.shareClass)
      };
    }
    
    return null;
  };

  const currentChart = getCurrentChartData();

  return (
    <div className="w-full space-y-6">
      {/* Main Title and Toggle Buttons */}
      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 w-full">
          <h5 className="text-lg sm:text-xl font-semibold break-words">
            {title}
          </h5>
          {dateRangeLabel && (
            <div className="text-sm sm:text-base font-medium text-brand-text">
              {dateRangeLabel}
            </div>
          )}
        </div>

        {/* Toggle Buttons */}
        <div className="flex flex-wrap gap-2">

           {/* Authorized Share Button */}
          {authorizedShares > 0 && (
            <Button
              variant={selectedView === "authorized" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedView("authorized")}
              className="rounded-lg"
            >
              Authorized Share
            </Button>
          )}



          {/* Classes Button - NEW */}
          <Button
            variant={selectedView === "classes" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("classes")}
            className="rounded-lg"
          >
            Classes
          </Button>

          {/* Total Button */}
          <Button
            variant={selectedView === "total" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedView("total")}
            className="rounded-lg"
          >
            Issued Share
          </Button>
        
          {/* Individual Class Buttons */}
          {chartsData.map(({ shareClass }) => (
            <Button
              key={shareClass}
              variant={selectedView === shareClass ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedView(shareClass)}
              className="rounded-lg"
            >
              {getClassButtonLabel(shareClass)}
            </Button>
          ))}
        </div>
      </div>

      {/* Single Chart View */}
      {currentChart ? (
        renderPieChart(currentChart.shareClass, currentChart.data, currentChart.label)
      ) : (
        <div className="w-full bg-white border border-border rounded-2xl text-brand-text p-8 flex items-center justify-center">
          <div className="text-xl md:text-3xl text-gray-600">
            No share percentage data available
          </div>
        </div>
      )}
    </div>
  );
};

export default SharePieChart;
