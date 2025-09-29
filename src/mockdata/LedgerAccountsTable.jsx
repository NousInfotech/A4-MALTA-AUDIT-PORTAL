import react from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getLedgerAccounts } from "./mock";

export function LedgerAccountsTable() {
  return (
    <div>
      <Table className='bg-white'>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Current Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getLedgerAccounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-medium">{account.code}</TableCell>
              <TableCell>{account.name}</TableCell>
              <TableCell>{account.description}</TableCell>
              <TableCell className="capitalize">{account.type}</TableCell>
              <TableCell className="capitalize">{account.status}</TableCell>
              <TableCell className="text-right">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: account.currency,
                }).format(account.current_balance)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
