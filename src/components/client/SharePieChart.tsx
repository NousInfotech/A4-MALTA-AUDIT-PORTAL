"use client";
import React, { useMemo, useState } from "react";
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

type ShareholdingCompany = {
  companyId: string | {
    _id: string;
    name: string;
    registrationNumber?: string;
  };
  // sharePercentage at the shareHoldingCompany level
  sharePercentage?: number;
  // sharesData is now an array
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

type ViewMode = "total" | "classA" | "classB" | "classC";

const SharePieChart: React.FC<SharePieChartProps> = ({
  persons = [],
  companies = [],
  title = "Shareholders",
  dateRangeLabel = "",
  companyTotalShares = 0,
  companyTotalSharesArray = [],
}) => {
  // Determine if company uses Ordinary or Class-based shares
  const isClassBased = useMemo(() => {
    if (!Array.isArray(companyTotalSharesArray) || companyTotalSharesArray.length === 0) {
      return false;
    }
    const hasOrdinary = companyTotalSharesArray.some(item => item.class === "Ordinary");
    const hasShareClasses = companyTotalSharesArray.some(item => ["A", "B", "C"].includes(item.class));
    return hasShareClasses && !hasOrdinary;
  }, [companyTotalSharesArray]);

  const [viewMode, setViewMode] = useState<ViewMode>("total");

  // Get total shares for a specific class from companyTotalSharesArray
  const getClassTotal = (shareClass: string): number => {
    if (!Array.isArray(companyTotalSharesArray)) return 0;
    const item = companyTotalSharesArray.find(s => s.class === shareClass);
    return item ? Number(item.totalShares) || 0 : 0;
  };

  // Get total shares for all classes A, B, C combined
  const getTotalClassShares = (): number => {
    return getClassTotal("A") + getClassTotal("B") + getClassTotal("C");
  };

  // Calculate chart data based on view mode
  const { normalizedData, totalRaw, companyTotal, personTotal, personTotalShares, companyTotalShares: companySharesTotal, totalSharesSum, currentClassTotal } = useMemo(() => {
    // Determine which class to filter by based on viewMode
    let targetClass: string | null = null;
    let currentTotal = companyTotalShares;

    if (isClassBased) {
      if (viewMode === "total") {
        // Total of all classes A, B, C
        currentTotal = getTotalClassShares();
      } else if (viewMode === "classA") {
        targetClass = "A";
        currentTotal = getClassTotal("A");
      } else if (viewMode === "classB") {
        targetClass = "B";
        currentTotal = getClassTotal("B");
      } else if (viewMode === "classC") {
        targetClass = "C";
        currentTotal = getClassTotal("C");
      }
    } else {
      // For Ordinary shares, use Ordinary class total
      currentTotal = getClassTotal("Ordinary") || companyTotalShares;
    }

    // Helper to filter shares by class
    const filterSharesByClass = (sharesData: any[], classFilter: string | null): number => {
      if (!Array.isArray(sharesData)) return 0;
      
      if (!isClassBased) {
        // For Ordinary shares, filter by "Ordinary" class
        return sharesData
          .filter(item => item.class === "Ordinary")
          .reduce((sum, item) => sum + (Number(item.totalShares) || 0), 0);
      }
      
      // For class-based shares
      if (classFilter === null) {
        // For total view, sum all classes A, B, C
        return sharesData
          .filter(item => ["A", "B", "C"].includes(item.class))
          .reduce((sum, item) => sum + (Number(item.totalShares) || 0), 0);
      }
      // For specific class, filter by that class
      return sharesData
        .filter(item => item.class === classFilter)
        .reduce((sum, item) => sum + (Number(item.totalShares) || 0), 0);
    };

    // Process persons
    const personData = (persons || [])
      .map((p: any) => {
        const totalShares = filterSharesByClass(p?.sharesData || [], targetClass);
        
        let percentage = 0;
        if (totalShares > 0 && currentTotal > 0) {
          percentage = (totalShares / currentTotal) * 100;
        } else if (totalShares === 0 && currentTotal === 0 && !isClassBased) {
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
        
        const totalShares = filterSharesByClass(share?.sharesData || [], targetClass);
        
        let percentage = 0;
        if (totalShares > 0 && currentTotal > 0) {
          percentage = (totalShares / currentTotal) * 100;
        } else if (totalShares === 0 && currentTotal === 0 && !isClassBased) {
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
  }, [persons, companies, companyTotalShares, companyTotalSharesArray, isClassBased, viewMode]);

  // Render a single pie chart
 

  // Calculate data for each class when in class-based mode
  const calculateClassData = (targetClass: string) => {
    const classTotal = getClassTotal(targetClass);
    const filterSharesByClass = (sharesData: any[], classFilter: string): number => {
      if (!Array.isArray(sharesData)) return 0;
      return sharesData
        .filter(item => item.class === classFilter)
        .reduce((sum, item) => sum + (Number(item.totalShares) || 0), 0);
    };

    const personData = (persons || [])
      .map((p: any) => {
        const totalShares = filterSharesByClass(p?.sharesData || [], targetClass);
        const percentage = totalShares > 0 && classTotal > 0 ? (totalShares / classTotal) * 100 : 0;
        return {
          name: p?.name || "Unnamed",
          value: percentage,
          totalShares: totalShares,
          type: "Person",
        };
      })
      .filter((d) => !isNaN(d.value) && d.value > 0);

    const companyData = (companies || [])
      .map((share: any) => {
        let companyName = "Unknown Company";
        if (share.companyId) {
          if (typeof share.companyId === 'object' && share.companyId.name) {
            companyName = share.companyId.name;
          }
        }
        const totalShares = filterSharesByClass(share?.sharesData || [], targetClass);
        const percentage = totalShares > 0 && classTotal > 0 ? (totalShares / classTotal) * 100 : 0;
        return {
          name: companyName,
          value: percentage,
          totalShares: totalShares,
          type: "Company",
        };
      })
      .filter((d) => !isNaN(d.value) && d.value > 0);

    const raw = [...personData, ...companyData];
    const sum = raw.reduce((acc, d) => acc + d.value, 0);

    if (sum <= 0) return { normalizedData: [], totalRaw: 0, totalSharesSum: 0 };

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
        const remainingShares = classTotal > 0 ? Math.round((remaining / 100) * classTotal) : 0;
        parts.push({ 
          name: "Remaining Shares", 
          value: remaining,
          totalShares: remainingShares
        });
      }
    }

    const totalSharesSum = raw.reduce((acc, d) => acc + (d.totalShares || 0), 0);
    return { normalizedData: parts, totalRaw: sum, totalSharesSum };
  };

  const classAData = isClassBased ? calculateClassData("A") : null;
  const classBData = isClassBased ? calculateClassData("B") : null;
  const classCData = isClassBased ? calculateClassData("C") : null;
  const totalClassData = isClassBased ? (() => {
    const totalClassShares = getTotalClassShares();
    const filterAllClasses = (sharesData: any[]): number => {
      if (!Array.isArray(sharesData)) return 0;
      return sharesData
        .filter(item => ["A", "B", "C"].includes(item.class))
        .reduce((sum, item) => sum + (Number(item.totalShares) || 0), 0);
    };

    const personData = (persons || [])
      .map((p: any) => {
        const totalShares = filterAllClasses(p?.sharesData || []);
        const percentage = totalShares > 0 && totalClassShares > 0 ? (totalShares / totalClassShares) * 100 : 0;
        return {
          name: p?.name || "Unnamed",
          value: percentage,
          totalShares: totalShares,
          type: "Person",
        };
      })
      .filter((d) => !isNaN(d.value) && d.value > 0);

    const companyData = (companies || [])
      .map((share: any) => {
        let companyName = "Unknown Company";
        if (share.companyId) {
          if (typeof share.companyId === 'object' && share.companyId.name) {
            companyName = share.companyId.name;
          }
        }
        const totalShares = filterAllClasses(share?.sharesData || []);
        const percentage = totalShares > 0 && totalClassShares > 0 ? (totalShares / totalClassShares) * 100 : 0;
        return {
          name: companyName,
          value: percentage,
          totalShares: totalShares,
          type: "Company",
        };
      })
      .filter((d) => !isNaN(d.value) && d.value > 0);

    const raw = [...personData, ...companyData];
    const sum = raw.reduce((acc, d) => acc + d.value, 0);
    const totalSharesSum = raw.reduce((acc, d) => acc + (d.totalShares || 0), 0);

    if (sum <= 0) return { normalizedData: [], totalRaw: 0, totalSharesSum: 0 };

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
        const remainingShares = totalClassShares > 0 ? Math.round((remaining / 100) * totalClassShares) : 0;
        parts.push({ 
          name: "Remaining Shares", 
          value: remaining,
          totalShares: remainingShares
        });
      }
    }

    return { normalizedData: parts, totalRaw: sum, totalSharesSum };
  })() : null;

  return (
    <div className="w-full bg-white border border-border rounded-2xl text-brand-text p-4 sm:p-5 md:p-6 overflow-hidden">
      {/* Header */}
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

      {/* Toggle Buttons for Class-based shares */}
      {isClassBased && (
        <div className="flex flex-wrap gap-2 mt-4 mb-4">
          <Button
            variant={viewMode === "total" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("total")}
            className="rounded-lg"
          >
            Total Shares
          </Button>
          <Button
            variant={viewMode === "classA" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("classA")}
            className="rounded-lg"
          >
            Class A Shares
          </Button>
          <Button
            variant={viewMode === "classB" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("classB")}
            className="rounded-lg"
          >
            Class B Shares
          </Button>
          <Button
            variant={viewMode === "classC" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("classC")}
            className="rounded-lg"
          >
            Class C Shares
          </Button>
        </div>
      )}

      {/* Chart Section */}
      {/* Show single chart for all views */}
      <div className="py-4 sm:py-6" id="pie-chart">
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
                  outerRadius="75%"
                  label={(entry) => {
                    const percentage = Number(entry.value).toFixed(0);
                    const shares = entry.totalShares ? ` (${Number(entry.totalShares).toLocaleString()} ${viewMode === "total" ? "shares" : "shares " + viewMode.charAt(0).toUpperCase() + viewMode.slice(1)})` : '';
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

      {/* Footer - show for all views */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="text-center sm:text-left space-y-1">
          <p className="text-base sm:text-lg">
            Total declared {viewMode === "total" ? "shares" : "shares " + viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}:{" "}
            <span className="font-bold">{totalRaw.toFixed(0)}%</span>
            {totalSharesSum > 0 && (
              <span className="text-gray-600 ml-2">
                ({totalSharesSum.toLocaleString()} out of {currentClassTotal.toLocaleString()} shares)
              </span>
            )}
          </p>
          {(companyTotal > 0 || personTotal > 0) && (
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

export default SharePieChart;
