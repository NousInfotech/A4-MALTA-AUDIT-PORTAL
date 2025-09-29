// src/components/JournalEntriesTable.tsx
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  JournalEntry,
  JournalEntriesResponse,
} from "@/mockdata/types/journal";
import { getJournalEntries } from "./mock";
import { ChevronDown, ChevronUp } from "lucide-react"; // Importing icons

interface JournalEntriesTableProps {
  data: JournalEntriesResponse;
}

const JournalEntriesTable = () => {
  const journalEntries = getJournalEntries.data;
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  return (
    <div className="rounded-md border p-4 bg-white shadow-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Journal Entries Overview</h2>
      <div className="overflow-x-auto"> {/* Makes the table horizontally scrollable */}
        <Table className="min-w-full bg-white rounded-lg">
          <TableHeader className="bg-gray-100 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[120px] text-gray-700 font-semibold">ID</TableHead>
              <TableHead className="w-[120px] text-gray-700 font-semibold">Date</TableHead>
              <TableHead className="w-[150px] text-gray-700 font-semibold">Reference</TableHead>
              <TableHead className="min-w-[250px] text-gray-700 font-semibold">Note</TableHead> {/* Adjusted width and no truncate */}
              <TableHead className="w-[100px] text-gray-700 font-semibold">Currency</TableHead>
              <TableHead className="text-right w-[150px] text-gray-700 font-semibold">Total Amount</TableHead>
              <TableHead className="w-[120px] text-gray-700 font-semibold">Status</TableHead>
              <TableHead className="w-[150px] text-gray-700 font-semibold">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {journalEntries.map((entry) => (
              <React.Fragment key={entry.id}>
                <TableRow className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                  <TableCell className="font-medium text-gray-900">{entry.id}</TableCell>
                  <TableCell className="text-gray-700">{entry.journal_date}</TableCell>
                  <TableCell className="text-gray-700">{entry.reference}</TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-gray-700"> {/* Allows full text to render */}
                    {entry.note}
                  </TableCell>
                  <TableCell className="text-gray-700">{entry.currency}</TableCell>
                  <TableCell className="text-right font-semibold text-gray-800">
                    {entry.total_amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        entry.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleExpand(entry.id)}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm transition-colors"
                    >
                      {expandedRows.has(entry.id) ? (
                        <>
                          Hide Line Items <ChevronUp className="ml-1 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          View Line Items <ChevronDown className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </button>
                  </TableCell>
                </TableRow>
                {/* Expandable row for line items */}
                {expandedRows.has(entry.id) && (
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableCell colSpan={8} className="py-4 px-6">
                      <div className="font-bold text-base text-gray-800 mb-3">
                        Line Items for Journal Entry <span className="text-blue-600">#{entry.id}</span>:
                      </div>
                      <div className="overflow-x-auto">
                        <Table className="min-w-full bg-white border border-gray-200 rounded-md shadow-inner">
                          <TableHeader className="bg-gray-100">
                            <TableRow>
                              <TableHead className="text-gray-600 font-medium">Account Name</TableHead>
                              <TableHead className="min-w-[200px] text-gray-600 font-medium">Description</TableHead>
                              <TableHead className="text-right text-gray-600 font-medium">Amount</TableHead>
                              <TableHead className="text-right text-gray-600 font-medium">Tax</TableHead>
                              <TableHead className="text-gray-600 font-medium">Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entry.line_items.map((item) => (
                              <TableRow key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                <TableCell className="text-gray-700 text-sm">{item.account_name}</TableCell>
                                <TableCell className="max-w-[250px] whitespace-normal text-gray-600 text-sm"> {/* Allows full text to render */}
                                  {item.description}
                                </TableCell>
                                <TableCell className="text-right text-gray-700 text-sm">
                                  {item.amount.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right text-gray-700 text-sm">
                                  {item.tax_amount.toFixed(2)}
                                  {item.tax_type && ` (${item.tax_type})`}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      item.type === "debit"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default JournalEntriesTable;