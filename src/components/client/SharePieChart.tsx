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

interface SharePieChartProps {
  persons: Person[];
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
  persons,
  title = "Shareholders",
  dateRangeLabel = "",
}) => {
  const { normalizedData, totalRaw } = useMemo(() => {
    const raw = (persons || [])
      .map((p) => ({
        name: p?.name || "Unnamed",
        value: Number(p?.sharePercentage ?? 0),
      }))
      .filter((d) => !isNaN(d.value) && d.value > 0);

    const sum = raw.reduce((acc, d) => acc + d.value, 0);

    if (sum <= 0) return { normalizedData: [], totalRaw: 0 };

    let parts: { name: string; value: number }[];
    if (sum > 100) {
      const scale = 100 / sum;
      parts = raw.map((d) => ({ name: d.name, value: d.value * scale }));
    } else {
      parts = [...raw];
      const remaining = Math.max(0, 100 - sum);
      if (remaining > 0.0001)
        parts.push({ name: "No Data", value: remaining });
    }

    return { normalizedData: parts, totalRaw: sum };
  }, [persons]);

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
                    `${entry.name}: ${Number(entry.value)}%`
                  }
                  isAnimationActive
                  className="capitalize"
                >
                  {normalizedData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === "No Data"
                          ? "#9ca3af"
                          : COLORS[index % COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${Number(val)}%`,
                    name,
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
            <div className="h-full flex items-center justify-center text-sm text-brand-text">
              No share percentage data available
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-center sm:text-left">
        <p className="text-base sm:text-lg">
          Total declared shares:{" "}
          <span className="font-bold">{totalRaw}%</span>
        </p>
      </div>
    </div>
  );
};

export default SharePieChart;
