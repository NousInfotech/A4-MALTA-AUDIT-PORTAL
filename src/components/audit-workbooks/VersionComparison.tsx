
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Diff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Workbook } from '../../types/audit-workbooks/types';

interface VersionComparisonProps {
  workbook: Workbook | null;
  onBack: () => void;
  onUploadSuccess: () => void;
}

// Mock data for different versions
const mockOldVersionData = [
  ['', 'A', 'B', 'C', 'D'],
  ['1', 'Assets', '1000', '2000', '3000'],
  ['2', 'Liabilities', '250', '600', '700'],
  ['3', 'Equity', '500', '1400', '2300'],
  ['4', 'Total', '1750', '4000', '6000'],
];

const mockNewVersionData = [
  ['', 'A', 'B', 'C', 'D'],
  ['1', 'Assets', '1000', '2000', '3000'],
  ['2', 'Liabilities', '275', '600', '700'],
  ['3', 'Equity', '500', '1400', '2300'],
  ['4', 'Total', '1775', '4000', '6000'],
];

const mockSheetDatasetChanges = [
  { 
    sheetName: 'Balance_Sheet', 
    changeType: 'modified', 
    rowsAdded: 0, 
    rowsRemoved: 0, 
    rowsModified: 2,
    details: 'Values in row 2 and 4 were updated'
  },
  { 
    sheetName: 'Income_Statement', 
    changeType: 'added', 
    rowsAdded: 5, 
    rowsRemoved: 0, 
    rowsModified: 0,
    details: 'New rows added for Q4 data'
  },
  { 
    sheetName: 'Cash_Flow', 
    changeType: 'removed', 
    rowsAdded: 0, 
    rowsRemoved: 2, 
    rowsModified: 0,
    details: 'Old entries removed'
  },
];

const mockCellLevelChanges = [
  { 
    sheetName: 'Balance_Sheet', 
    cell: 'B2', 
    oldValue: '$250', 
    newValue: '$275', 
    change: '+10%',
    mappingAffected: true,
    mappingName: 'ppe_nbv_close'
  },
  { 
    sheetName: 'Balance_Sheet', 
    cell: 'B4', 
    oldValue: '$1750', 
    newValue: '$1775', 
    change: '+1.4%',
    mappingAffected: false,
    mappingName: null
  },
];

export const VersionComparison: React.FC<VersionComparisonProps> = ({ workbook, onBack, onUploadSuccess }) => {
  const [activeTab, setActiveTab] = useState('cell-changes');
  const [selectedVersion, setSelectedVersion] = useState<'old' | 'new'>('new');

  if (!workbook) return null;

  const getCellClassName = (rowIndex: number, colIndex: number, version: 'old' | 'new') => {
    const data = version === 'old' ? mockOldVersionData : mockNewVersionData;
    const otherData = version === 'old' ? mockNewVersionData : mockOldVersionData;
    
    const currentValue = data[rowIndex]?.[colIndex];
    const otherValue = otherData[rowIndex]?.[colIndex];
    
    if (currentValue !== otherValue) {
      return version === 'new' ? 'bg-green-100 font-semibold' : 'bg-red-100';
    }
    
    return '';
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Version Comparison for {workbook.name}</h1>
            <p className="text-xs text-gray-500">
              Comparing {workbook.previousVersion || 'v1'} with {workbook.version}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 overflow-auto space-y-6">
        {/* Version Switcher */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={selectedVersion === 'old' ? 'border-blue-500' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                {workbook.previousVersion || 'v1'}
                <Badge variant="outline">Previous</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Uploaded on 2023-05-15</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={() => setSelectedVersion('old')}
              >
                View Version
              </Button>
            </CardContent>
          </Card>
          <Card className={selectedVersion === 'new' ? 'border-blue-500' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                {workbook.version}
                <Badge variant="default">Current</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Uploaded on {new Date().toLocaleDateString()}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setSelectedVersion('new')}
              >
                View Version
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Changes Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Diff className="h-5 w-5" />
              Changes Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{mockCellLevelChanges.length}</div>
                <div className="text-sm text-gray-600">Cell Changes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {mockSheetDatasetChanges.filter(c => c.changeType === 'added').reduce((sum, c) => sum + c.rowsAdded, 0)}
                </div>
                <div className="text-sm text-gray-600">Rows Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {mockSheetDatasetChanges.filter(c => c.changeType === 'removed').reduce((sum, c) => sum + c.rowsRemoved, 0)}
                </div>
                <div className="text-sm text-gray-600">Rows Removed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {mockCellLevelChanges.filter(c => c.mappingAffected).length}
                </div>
                <div className="text-sm text-gray-600">Mappings Affected</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Changes */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cell-changes">Cell Changes</TabsTrigger>
            <TabsTrigger value="sheet-dataset">Sheet/Dataset Changes</TabsTrigger>
            <TabsTrigger value="spreadsheet">Spreadsheet View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cell-changes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cell-Level Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockCellLevelChanges.map((change, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{change.cell}</Badge>
                        <span className="text-sm">
                          {change.oldValue} → {change.newValue}
                        </span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {change.change}
                        </Badge>
                      </div>
                      {change.mappingAffected && (
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-orange-600">
                            Mapping: {change.mappingName}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sheet-dataset" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sheet/Dataset Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockSheetDatasetChanges.map((change, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{change.sheetName}</h4>
                        <Badge 
                          variant={change.changeType === 'added' ? 'default' : change.changeType === 'removed' ? 'destructive' : 'secondary'}
                        >
                          {change.changeType}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{change.details}</p>
                      <div className="flex space-x-4 text-sm">
                        <span className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          Added: {change.rowsAdded}
                        </span>
                        <span className="flex items-center">
                          <XCircle className="h-4 w-4 text-red-500 mr-1" />
                          Removed: {change.rowsRemoved}
                        </span>
                        <span className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-orange-500 mr-1" />
                          Modified: {change.rowsModified}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="spreadsheet" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Spreadsheet View</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Viewing:</span>
                    <Badge variant={selectedVersion === 'new' ? 'default' : 'outline'}>
                      {selectedVersion === 'new' ? workbook.version : workbook.previousVersion || 'v1'}
                    </Badge>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {(selectedVersion === 'new' ? mockNewVersionData : mockOldVersionData).length > 0 && (
                        <TableRow>
                          {(selectedVersion === 'new' ? mockNewVersionData : mockOldVersionData)[0].map((header, index) => (
                            <TableHead key={index} className="min-w-[100px]">{header}</TableHead>
                          ))}
                        </TableRow>
                      )}
                    </TableHeader>
                    <TableBody>
                      {(selectedVersion === 'new' ? mockNewVersionData : mockOldVersionData).slice(1).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell 
                              key={cellIndex} 
                              className={`min-w-[100px] ${getCellClassName(rowIndex + 1, cellIndex, selectedVersion)}`}
                            >
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button onClick={onUploadSuccess}>Apply Changes</Button>
        </div>
      </main>
    </div>
  );
};