// components/RatioTable.tsx
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { History, Plus, Trash, CheckCircle, TriangleAlert, HelpCircle, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { Ratio } from './AnalyticalReviewSection'; // Import Ratio interface

interface RatioTableProps {
  ratios: Ratio[];
  onRatioChange: (updatedRatio: Ratio) => void;
  onDeleteRatio: (id: string) => void;
}

export const RatioTable: React.FC<RatioTableProps> = ({ ratios, onRatioChange, onDeleteRatio }) => {

  // Helper function to simulate ratio calculation (replace with actual logic)
  const calculateRatio = (ratio: Ratio): string => {
    // This is where your actual robust calculation logic would go
    // For now, let's just make a placeholder
    if (ratio.formulaType === 'predefined') {
      switch (ratio.predefinedFormula) {
        case 'grossProfit': return (parseFloat(ratio.priorPeriodValue || '0') * 1.05).toFixed(2); // Example calculation
        case 'receivablesDays': return (parseFloat(ratio.priorPeriodValue || '0') + 15).toFixed(0);
        // Add more predefined formula calculations
        default: return ratio.priorPeriodValue; // Fallback
      }
    } else if (ratio.numerator && ratio.denominator) {
      const num = parseFloat(ratio.numerator);
      const den = parseFloat(ratio.denominator);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return (num / den).toFixed(2); // Example custom calculation
      }
    }
    return ratio.priorPeriodValue; // Default to prior if no formula or invalid
  };


  const getStatusBadge = (status: Ratio['status']) => {
    switch (status) {
      case 'Explained': return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Explained</Badge>;
      case 'Unexplained': return <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Unexplained</Badge>;
      case 'Needs Follow-up': return <Badge variant="destructive" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Follow-up</Badge>;
      default: return null;
    }
  };

  const getStatusIcon = (status: Ratio['status']) => {
    switch (status) {
      case 'Explained': return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'Unexplained': return <TriangleAlert className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'Needs Follow-up': return <HelpCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      default: return null;
    }
  };


  return (
    <div className="overflow-x-auto relative shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
      <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <TableHeader className="bg-gray-50 dark:bg-brand-hover sticky top-0 z-10">
          <TableRow className="text-gray-700 dark:text-gray-300 uppercase text-xs tracking-wider">
            <TableHead className="py-3 px-4 font-semibold">Ratio Name / Label</TableHead>
            <TableHead className="py-3 px-4 font-semibold w-[250px]">Formula</TableHead>
            <TableHead className="py-3 px-4 font-semibold w-[120px]">Prior Period Value</TableHead>
            <TableHead className="py-3 px-4 font-semibold w-[150px]">Current Period Value (Calculated)</TableHead>
            <TableHead className="py-3 px-4 font-semibold w-[200px]">Comments / Observations</TableHead>
            <TableHead className="py-3 px-4 font-semibold text-center w-[120px]">Status <ChevronDown className="inline-block ml-1 h-3 w-3 align-middle" aria-label="Sort Status" /></TableHead>
            <TableHead className="py-3 px-4 font-semibold text-center w-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white dark:bg-brand-sidebar divide-y divide-gray-100 dark:divide-gray-800">
          {ratios.map((ratio) => (
            <TableRow key={ratio.id} className="hover:bg-gray-50 dark:hover:bg-brand-hover transition-colors duration-150">
              <TableCell className="py-3 px-4">
                <Input
                  type="text"
                  value={ratio.name}
                  onChange={(e) => onRatioChange({ ...ratio, name: e.target.value })}
                  placeholder="e.g., Gross Profit %"
                  className="w-full"
                />
              </TableCell>
              <TableCell className="py-3 px-4 relative">
                <Select
                  value={ratio.formulaType}
                  onValueChange={(value: 'predefined' | 'custom') => onRatioChange({ ...ratio, formulaType: value })}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select Formula Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="predefined">Predefined Formula</SelectItem>
                    <SelectItem value="custom">Custom Formula</SelectItem>
                  </SelectContent>
                </Select>

                {ratio.formulaType === 'predefined' && (
                  <Select
                    value={ratio.predefinedFormula}
                    onValueChange={(value) => onRatioChange({ ...ratio, predefinedFormula: value })}
                  >
                    <SelectTrigger className="w-full mt-2 text-xs">
                      <SelectValue placeholder="Select Predefined Formula" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grossProfit">Gross Profit % (Gross Profit ÷ Turnover)</SelectItem>
                      <SelectItem value="receivablesDays">Receivables Days (Receivables ÷ Credit Sales x 365)</SelectItem>
                      {/* Add more predefined options */}
                    </SelectContent>
                  </Select>
                )}
                {ratio.formulaType === 'custom' && (
                  <div className="flex flex-col sm:flex-row gap-1 mt-2 items-center">
                    <Input
                      type="text"
                      value={ratio.numerator || ''}
                      onChange={(e) => onRatioChange({ ...ratio, numerator: e.target.value })}
                      placeholder="Numerator"
                      className="w-full sm:w-1/2 text-xs"
                    />
                    <span className="text-gray-500 dark:text-gray-400">÷</span>
                    <Input
                      type="text"
                      value={ratio.denominator || ''}
                      onChange={(e) => onRatioChange({ ...ratio, denominator: e.target.value })}
                      placeholder="Denominator"
                      className="w-full sm:w-1/2 text-xs"
                    />
                  </div>
                )}
              </TableCell>
              <TableCell className="py-3 px-4">
                <Input
                  type="number"
                  value={ratio.priorPeriodValue}
                  onChange={(e) => onRatioChange({ ...ratio, priorPeriodValue: e.target.value })}
                  placeholder="e.g., 30.00"
                  className="w-full text-right"
                />
              </TableCell>
              <TableCell className="py-3 px-4">
                 <Input
                    type="text" // Keep as text to allow non-numeric for some ratios (e.g., '8x')
                    value={
                      ratio.formulaType !== 'custom' && ratio.predefinedFormula ||
                      (ratio.formulaType === 'custom' && ratio.numerator && ratio.denominator)
                        ? calculateRatio(ratio) // Show calculated if formula exists
                        : ratio.currentPeriodValue // Otherwise show directly entered
                    }
                    onChange={(e) => onRatioChange({ ...ratio, currentPeriodValue: e.target.value })}
                    placeholder="Auto-calculated"
                    className="w-full text-right bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 font-medium"
                    readOnly={
                        ratio.formulaType === 'predefined' && ratio.predefinedFormula !== ''
                    } // Make read-only if predefined and formula selected
                />
              </TableCell>
              <TableCell className="py-3 px-4 relative">
                <Textarea
                  value={ratio.comments}
                  onChange={(e) => onRatioChange({ ...ratio, comments: e.target.value })}
                  placeholder="Enter observations..."
                  className="min-h-[40px] text-sm"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <History size={16} aria-label="View Comments History" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-brand-hover text-white dark:bg-gray-100 dark:text-gray-900">
                      <p>View Version History for Comments</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell className="py-3 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Select
                    value={ratio.status}
                    onValueChange={(value: Ratio['status']) => onRatioChange({ ...ratio, status: value })}
                  >
                    <SelectTrigger className="w-[100px] text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Explained">Explained</SelectItem>
                      <SelectItem value="Unexplained">Unexplained</SelectItem>
                      <SelectItem value="Needs Follow-up">Needs Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                  {getStatusIcon(ratio.status)}
                </div>
              </TableCell>
              <TableCell className="py-3 px-4 text-center">
                <Button variant="destructive" size="icon" onClick={() => onDeleteRatio(ratio.id)} className="h-8 w-8">
                  <Trash size={16} aria-label="Delete Ratio" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};