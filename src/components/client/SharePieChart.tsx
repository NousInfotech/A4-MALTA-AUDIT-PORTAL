"use client";
import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
  // Old format
  sharePercentage?: number;
  // New normalized format from backend
  sharesData?: {
    percentage?: number;
    totalShares?: number;
    class?: string;
  };
};

interface SharePieChartProps {
  persons?: Person[];
  companies?: ShareholdingCompany[];
  title?: string;
  dateRangeLabel?: string;
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

const SharePieChart: React.FC<SharePieChartProps> = ({
  persons = [],
  companies = [],
  title = "Shareholders",
  dateRangeLabel = "",
}) => {
  const { normalizedData, totalRaw, companyTotal, personTotal } = useMemo(() => {
    // Process persons
    const personData = (persons || [])
      .map((p) => ({
        name: p?.name || "Unnamed",
        value: Number(p?.sharePercentage ?? 0),
        type: "Person",
      }))
      .filter((d) => !isNaN(d.value) && d.value > 0);

    // Process companies
    const companyData = (companies || [])
      .map((share) => {
        let companyName = "Unknown Company";
        if (share.companyId) {
          if (typeof share.companyId === 'object' && share.companyId.name) {
            companyName = share.companyId.name;
          } else if (typeof share.companyId === 'string') {
            companyName = "Unknown Company";
          }
        }
        const percentage =
          share?.sharePercentage !== undefined && share?.sharePercentage !== null
            ? Number(share.sharePercentage)
            : Number(share?.sharesData?.percentage ?? 0);
        return {
          name: companyName,
          value: percentage,
          type: "Company",
        };
      })
      .filter((d) => !isNaN(d.value) && d.value > 0);

    // Combine both
    const raw = [...personData, ...companyData];

    const personSum = personData.reduce((acc, d) => acc + d.value, 0);
    const companySum = companyData.reduce((acc, d) => acc + d.value, 0);
    const sum = raw.reduce((acc, d) => acc + d.value, 0);

    if (sum <= 0) return { normalizedData: [], totalRaw: 0, companyTotal: 0, personTotal: 0 };

    let parts: { name: string; value: number; type?: string }[];
    if (sum > 100) {
      const scale = 100 / sum;
      parts = raw.map((d) => ({ name: d.name, value: d.value * scale, type: d.type }));
    } else {
      parts = [...raw];
      const remaining = Math.max(0, 100 - sum);
      if (remaining > 0.0001)
        parts.push({ name: "Remaining Shares", value: remaining });
    }

    return { 
      normalizedData: parts, 
      totalRaw: sum,
      companyTotal: companySum,
      personTotal: personSum,
    };
  }, [persons, companies]);

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

      {/* Chart Section */}
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
                  label={(entry) =>
                    `${entry.name}: ${Number(entry.value).toFixed(0)}%`
                  }
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
            Total declared shares:{" "}
            <span className="font-bold">{totalRaw.toFixed(0)}%</span>
          </p>
          {(companyTotal > 0 || personTotal > 0) && (
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-gray-600">
              {companyTotal > 0 && (
                <span>
                  Company shares: <span className="font-semibold text-gray-900">{companyTotal.toFixed(0)}%</span>
                </span>
              )}
              {personTotal > 0 && (
                <span>
                  Person shares: <span className="font-semibold text-gray-900">{personTotal.toFixed(0)}%</span>
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
