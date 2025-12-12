"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CItem } from "@/types/fs/fs";
import { Info } from "lucide-react";

export default function SectionC({ items }: { items: CItem[] }) {
  return (
    <div className="mb-10 mt-10">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl text-yellow-600 font-bold">Disclosure & Regulatory Breaches</h2>
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-600 text-white text-sm font-medium">{items?.length || 0}</div>
      </div>  
      
      {(!items || items.length === 0) ? (
        <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-6 text-center text-gray-500 italic">
          No disclosure or regulatory breaches found.
        </div>
      ) : (
      <Accordion type="multiple">
        {items.map((issue, idx) => (
          <AccordionItem key={idx} value={`C-${idx}`}>
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <Info className="text-yellow-500" size={18} />
                <span>{issue.test_id} — {issue.description}</span>
              </div>
            </AccordionTrigger>

            <AccordionContent className="text-sm space-y-2">
              <p><b>Impact:</b> {issue.impact}</p>
              <p><b>Suggested Fix:</b> {issue.suggested_fix}</p>

              <div className="mt-3 p-3 rounded bg-yellow-50">
                <p><b>Location:</b></p>
                <p>Page: {issue.location.page ?? "-"}</p>
                <p>Section: {issue.location.section ?? "-"}</p>
                <p>Note: {issue.location.note ?? "-"}</p>
                <p>Line Hint: {issue.location.line_hint ?? "-"}</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      )}
    </div>
  );
}
