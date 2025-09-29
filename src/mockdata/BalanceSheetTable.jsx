import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getBalanceSheet } from './mock'; 

const BalanceSheetTable = () => {
  const { data } = getBalanceSheet.getBalanceSheetResponse;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency,
    }).format(value);
  };

  const renderAccountSection = (title, accounts, total) => (
    <>
      <TableRow className="bg-gray-100 dark:bg-gray-800 font-semibold">
        <TableCell colSpan="2" className="text-lg">{title}</TableCell>
        <TableCell className="text-right text-lg">{formatCurrency(total)}</TableCell>
      </TableRow>
      {accounts.map((account) => (
        <TableRow key={account.id}>
          <TableCell className="pl-8">{account.name}</TableCell>
          <TableCell></TableCell> {/* Empty cell for alignment */}
          <TableCell className="text-right">{formatCurrency(account.value)}</TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <div className="container mx-auto p-4 bg-white border rounded-md">
      <h1 className="text-3xl font-bold mb-2">{data.reportName}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        As of: {new Date(data.reportDate).toLocaleDateString()}
      </p>

      <Table className='bg-white'>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60%]">Account</TableHead>
            <TableHead className="w-[20%]"></TableHead>
            <TableHead className="w-[20%] text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Assets Section */}
          <TableRow className="bg-blue-50 dark:bg-blue-950 font-bold">
            <TableCell colSpan="2" className="text-xl">ASSETS</TableCell>
            <TableCell className="text-right text-xl">{formatCurrency(data.assets.totalAssets)}</TableCell>
          </TableRow>
          {renderAccountSection("Current Assets", data.assets.currentAssets.accounts, data.assets.currentAssets.total)}
          {renderAccountSection("Non-Current Assets", data.assets.nonCurrentAssets.accounts, data.assets.nonCurrentAssets.total)}
          <TableRow className="bg-blue-100 dark:bg-blue-900 font-bold">
            <TableCell colSpan="2" className="text-lg">Total Assets</TableCell>
            <TableCell className="text-right text-lg">{formatCurrency(data.assets.totalAssets)}</TableCell>
          </TableRow>

          {/* Liabilities Section */}
          <TableRow className="bg-red-50 dark:bg-red-950 font-bold mt-4">
            <TableCell colSpan="2" className="text-xl">LIABILITIES</TableCell>
            <TableCell className="text-right text-xl">{formatCurrency(data.liabilities.totalLiabilities)}</TableCell>
          </TableRow>
          {renderAccountSection("Current Liabilities", data.liabilities.currentLiabilities.accounts, data.liabilities.currentLiabilities.total)}
          {renderAccountSection("Non-Current Liabilities", data.liabilities.nonCurrentLiabilities.accounts, data.liabilities.nonCurrentLiabilities.total)}
          <TableRow className="bg-red-100 dark:bg-red-900 font-bold">
            <TableCell colSpan="2" className="text-lg">Total Liabilities</TableCell>
            <TableCell className="text-right text-lg">{formatCurrency(data.liabilities.totalLiabilities)}</TableCell>
          </TableRow>

          {/* Equity Section */}
          <TableRow className="bg-green-50 dark:bg-green-950 font-bold mt-4">
            <TableCell colSpan="2" className="text-xl">EQUITY</TableCell>
            <TableCell className="text-right text-xl">{formatCurrency(data.equity.total)}</TableCell>
          </TableRow>
          {renderAccountSection("Owner's Equity", data.equity.accounts, data.equity.total)}
          <TableRow className="bg-green-100 dark:bg-green-900 font-bold">
            <TableCell colSpan="2" className="text-lg">Total Equity</TableCell>
            <TableCell className="text-right text-lg">{formatCurrency(data.equity.total)}</TableCell>
          </TableRow>

          {/* Total Liabilities and Equity */}
          <TableRow className="bg-purple-100 dark:bg-purple-900 font-bold border-t-2 border-gray-400 dark:border-gray-600">
            <TableCell colSpan="2" className="text-xl">Total Liabilities & Equity</TableCell>
            <TableCell className="text-right text-xl">{formatCurrency(data.totalLiabilitiesAndEquity)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default BalanceSheetTable;