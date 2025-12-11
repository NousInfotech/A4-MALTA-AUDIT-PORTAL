"use client";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AItem } from "@/types/fs/fs";
import { CheckCircle } from "lucide-react";

export default function SectionA({ items }: { items: AItem[] }) {
  return (
    <div className="mb-10 space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl text-green-600 font-bold">Confirmed Correct Items</h2>
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-sm font-medium">{items.length}</div>
      </div>

      <Accordion type="multiple">
        {items.map((item, idx) => (
          <AccordionItem key={idx} value={`A-${idx}`}>
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-500" size={18} />
                <span>{item.test_id} — {item.area}</span>
              </div>
            </AccordionTrigger>

            <AccordionContent className="text-sm text-gray-700">
              {item.details}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
