"use client";

import { ReconciliationTable } from "@/types/fs/fs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function formatValue(value: number | string | null) {
  if (value === null || value === undefined) return "-";

  // Auto-detect formatting for numbers
  if (typeof value === "number") {
    const style =
      value < 0
        ? "text-red-600 font-medium"
        : value > 0
        ? "text-gray-900"
        : "text-gray-700";
    return <span className={style}>{value.toLocaleString()}</span>;
  }

  return value;
}

function ReconciliationTableView({ table }: { table: ReconciliationTable }) {
  if (!table?.rows?.length) {
    return (
      <div className="text-sm text-gray-500 italic px-3 py-4">
        No reconciliation data available.
      </div>
    );
  }

  return (
    <Card className="p-0 border shadow-sm rounded-xl overflow-hidden transition-all hover:shadow-md">
      <ScrollArea className="w-full">
        <table className="w-full text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left font-semibold text-slate-700">
                Description
              </th>
              {table.columns.map((col, idx) => (
                <th
                  key={idx}
                  className="p-3 text-right font-semibold text-slate-700"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {table.rows.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  "border-b border-slate-100 transition-colors",
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50",
                  "hover:bg-blue-50/50"
                )}
              >
                <td className="p-3 font-medium text-slate-800">
                  {row.description}
                </td>

                {row.values.map((v, jdx) => (
                  <td key={jdx} className="p-3 text-right">
                    {formatValue(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </Card>
  );
}

export default function SectionD({ tables }: any) {
  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-blue-700 tracking-tight">
          Reconciliation Tables
        </h2>
      </header>

      <div className="space-y-10">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">
            Retained Earnings Reconciliation
          </h3>
          <ReconciliationTableView table={tables.retained_earnings} />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">
            Borrowings Analysis
          </h3>
          <ReconciliationTableView table={tables.borrowings} />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">
            Deferred Tax Reconciliation
          </h3>
          <ReconciliationTableView table={tables.deferred_tax} />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">
            Equity Movement Summary
          </h3>
          <ReconciliationTableView table={tables.equity} />
        </div>
      </div>
    </section>
  );
}
