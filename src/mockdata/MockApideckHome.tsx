import React from "react";
import JournalEntriesTable from "./JournalEntriesTable";
import { LedgerAccountsTable } from "./LedgerAccountsTable";
import ProfitLossTable from './ProfitLossTable';
import BalanceSheetTable from './BalanceSheetTable';

function MockApideckHome() {
  return (
    <div className="space-y-10">
      <JournalEntriesTable />
      <div className="container mx-auto py-10 bg-white border rounded-md">
        <h1 className="text-2xl font-bold mb-6">Ledger Accounts</h1>
        <LedgerAccountsTable />
      </div>

      <ProfitLossTable />

      <BalanceSheetTable />
    </div>
  );
}

export default MockApideckHome;
