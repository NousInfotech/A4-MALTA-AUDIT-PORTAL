"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { BItem } from "@/types/fs/fs";
import { AlertTriangle } from "lucide-react";

export default function SectionB({ items }: { items: BItem[] }) {
  return (
    <div className="space-y-3">
       <div className="flex items-center gap-3">
        <h2 className="text-xl text-red-600 font-bold">Critical Errors</h2>
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white text-sm font-medium">{items?.length || 0}</div>
      </div>

      {(!items || items.length === 0) ? (
        <div className="bg-red-50/50 border border-red-100 rounded-lg p-6 text-center text-gray-500 italic">
          No critical errors found.
        </div>
      ) : (
      <Accordion type="multiple">
        {items.map((err, idx) => (
          <AccordionItem key={idx} value={`B-${idx}`}>
            <AccordionTrigger>
              <div className="flex gap-3">
                <AlertTriangle className="text-red-500" size={18} />
                <span className="text-left">{err.test_id} — {err.description}</span>
              </div>
            </AccordionTrigger>

            <AccordionContent className="text-sm space-y-2">
              <p><b>Reason:</b> {err.reason}</p>
              <p><b>Financial Impact:</b> {err.financial_impact}</p>
              <p><b>Suggested Fix:</b> {err.suggested_fix}</p>

              <div className="mt-3 p-3 rounded bg-red-50">
                <p><b>Location:</b></p>
                <p>Page: {err.location.page ?? "-"}</p>
                <p>Section: {err.location.section ?? "-"}</p>
                <p>Note: {err.location.note ?? "-"}</p>
                <p>Line Hint: {err.location.line_hint ?? "-"}</p>
              </div>

              {err.reported_value !== undefined && (
                <p><b>Reported:</b> {err.reported_value}</p>
              )}
              {err.expected_value !== undefined && (
                <p><b>Expected:</b> {err.expected_value}</p>
              )}
              {err.difference !== undefined && (
                <p><b>Difference:</b> {err.difference}</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      )}
    </div>
  );
}
