import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Adjust path as needed

import { getProfitAndLoss } from "./mock";
import React from "react";

const ProfitLossTable = () => {
  const { data } = getProfitAndLoss.getProfitAndLossResponse;

  const formatCurrency = (value, currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  return (
    <div className="py-10 bg-white border rounded-md">
      <h2 className="px-5 text-2xl font-bold mb-4">{data.report_name}</h2>
      <p className="px-5 mb-2">
        <strong>Date Range:</strong> {data.start_date} to {data.end_date}
      </p>

      <Table className='bg-white'>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70%] text-left">Account</TableHead>
            <TableHead className="w-[30%] text-right">
              Amount ({data.currency})
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.sections.map((section) => (
            <React.Fragment key={section.id}>
              <TableRow className="bg-gray-100 font-semibold">
                <TableCell className="text-left py-2">{section.name}</TableCell>
                <TableCell className="text-right py-2">
                  {section.total.value !== undefined
                    ? formatCurrency(
                        section.total.value,
                        section.total.currency
                      )
                    : ""}
                </TableCell>
              </TableRow>
              {section.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-8 text-left">{item.name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.value, item.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProfitLossTable;
