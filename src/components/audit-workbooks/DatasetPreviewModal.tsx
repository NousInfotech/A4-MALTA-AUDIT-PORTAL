
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Workbook, DatasetMapping, ValidationResult } from '../../types/audit-workbooks/types';

interface DatasetPreviewModalProps {
  workbook: Workbook | null;
  onClose: () => void;
  onLink: (datasetMapping: DatasetMapping) => void;
}

// Mock data for preview
const mockPreviewData = [
  { 'Account': 'Assets', 'Q1': '1000', 'Q2': '1200', 'Q3': '1400', 'Q4': '1600' },
  { 'Account': 'Liabilities', 'Q1': '500', 'Q2': '600', 'Q3': '700', 'Q4': '800' },
  { 'Account': 'Equity', 'Q1': '500', 'Q2': '600', 'Q3': '700', 'Q4': '800' },
  { 'Account': 'Revenue', 'Q1': '2000', 'Q2': '2200', 'Q3': '2400', 'Q4': '2600' },
  { 'Account': 'Expenses', 'Q1': '1500', 'Q2': '1600', 'Q3': '1700', 'Q4': '1800' },
];

const mockValidationResults: ValidationResult[] = [
  { isValid: true, message: 'Valid row' },
  { isValid: true, message: 'Valid row' },
  { isValid: false, message: 'Invalid numeric value in Q3', row: 3, column: 'Q3' },
  { isValid: true, message: 'Valid row' },
  { isValid: false, message: 'Empty value in Q4', row: 5, column: 'Q4' },
];

export const DatasetPreviewModal: React.FC<DatasetPreviewModalProps> = ({ workbook, onClose, onLink }) => {
  const [sheetName, setSheetName] = useState('Balance_Sheet');
  const [datasetName, setDatasetName] = useState('');
  const [headerRow, setHeaderRow] = useState('1');
  const [keyColumn, setKeyColumn] = useState('A');
  const [columnMappings, setColumnMappings] = useState<{ [key: string]: string }>({});
  const [filters, setFilters] = useState<{ [key: string]: any }>({});
  const [validations, setValidations] = useState<{ [key: string]: any }>({});

  const handleAddColumnMapping = () => {
    setColumnMappings(prev => ({ ...prev, ['']: '' }));
  };

  const handleUpdateColumnMapping = (index: number, field: string, value: string) => {
    const keys = Object.keys(columnMappings);
    const newMappings = { ...columnMappings };
    delete newMappings[keys[index]];
    newMappings[field] = value;
    setColumnMappings(newMappings);
  };

  const handleRemoveColumnMapping = (index: number) => {
    const keys = Object.keys(columnMappings);
    const newMappings = { ...columnMappings };
    delete newMappings[keys[index]];
    setColumnMappings(newMappings);
  };

  const handleAddFilter = () => {
    setFilters(prev => ({ ...prev, ['']: { operator: '', value: '' } }));
  };

  const handleUpdateFilter = (index: number, field: string, operator: string, value: string) => {
    const keys = Object.keys(filters);
    const newFilters = { ...filters };
    delete newFilters[keys[index]];
    newFilters[field] = { operator, value };
    setFilters(newFilters);
  };

  const handleRemoveFilter = (index: number) => {
    const keys = Object.keys(filters);
    const newFilters = { ...filters };
    delete newFilters[keys[index]];
    setFilters(newFilters);
  };

  const handleLink = () => {
    if (!workbook || !datasetName) return;

    const newDatasetMapping: DatasetMapping = {
      id: Date.now().toString(),
      sheetName,
      datasetName,
      headerRow: parseInt(headerRow),
      keyColumn,
      columnMappings,
      filters,
      validations,
    };
    
    onLink(newDatasetMapping);
    onClose();
  };

  const validRows = mockValidationResults.filter(r => r.isValid).length;
  const invalidRows = mockValidationResults.filter(r => !r.isValid).length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Sheet as Dataset</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="configuration" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="preview">Preview & Validation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="configuration" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sheet-name">Sheet Name</Label>
                  <Select value={sheetName} onValueChange={setSheetName}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Balance_Sheet">Balance Sheet</SelectItem>
                      <SelectItem value="Income_Statement">Income Statement</SelectItem>
                      <SelectItem value="Cash_Flow">Cash Flow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataset-name">Dataset Name</Label>
                  <Input 
                    id="dataset-name" 
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="Enter dataset name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="header-row">Header Row</Label>
                  <Input 
                    id="header-row" 
                    value={headerRow}
                    onChange={(e) => setHeaderRow(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key-column">Key Column</Label>
                  <Select value={keyColumn} onValueChange={setKeyColumn}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Column A</SelectItem>
                      <SelectItem value="B">Column B</SelectItem>
                      <SelectItem value="C">Column C</SelectItem>
                      <SelectItem value="D">Column D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Column Mappings</Label>
                <div className="space-y-2">
                  {Object.entries(columnMappings).map(([sourceCol, targetField], index) => (
                    <div key={index} className="flex space-x-2">
                      <Select value={sourceCol} onValueChange={(value) => handleUpdateColumnMapping(index, value, targetField)}>
                        <SelectTrigger className="w-1/3">
                          <SelectValue placeholder="Source column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Column A</SelectItem>
                          <SelectItem value="B">Column B</SelectItem>
                          <SelectItem value="C">Column C</SelectItem>
                          <SelectItem value="D">Column D</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        placeholder="Target field" 
                        value={targetField}
                        onChange={(e) => handleUpdateColumnMapping(index, sourceCol, e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRemoveColumnMapping(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddColumnMapping}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Column Mapping
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filters (Optional)</Label>
                <div className="space-y-2">
                  {Object.entries(filters).map(([column, filter], index) => (
                    <div key={index} className="flex space-x-2">
                      <Select value={column} onValueChange={(value) => handleUpdateFilter(index, value, filter.operator || '', filter.value || '')}>
                        <SelectTrigger className="w-1/3">
                          <SelectValue placeholder="Column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Column A</SelectItem>
                          <SelectItem value="B">Column B</SelectItem>
                          <SelectItem value="C">Column C</SelectItem>
                          <SelectItem value="D">Column D</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filter.operator} onValueChange={(value) => handleUpdateFilter(index, column, value, filter.value || '')}>
                        <SelectTrigger className="w-1/4">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="=">Equals</SelectItem>
                          <SelectItem value="!=">Not Equals</SelectItem>
                          <SelectItem value=">">Greater Than</SelectItem>
                          <SelectItem value="<">Less Than</SelectItem>
                          <SelectItem value=">=">Greater or Equal</SelectItem>
                          <SelectItem value="<=">Less or Equal</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        placeholder="Value" 
                        value={filter.value}
                        onChange={(e) => handleUpdateFilter(index, column, filter.operator || '', e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRemoveFilter(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddFilter}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Filter
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(mockPreviewData[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPreviewData.map((row, index) => (
                      <TableRow key={index} className={mockValidationResults[index]?.isValid ? '' : 'bg-red-50'}>
                        {Object.values(row).map((value, i) => (
                          <TableCell key={i}>{value}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Validation Results</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> 
                    Total Rows: {mockPreviewData.length}
                  </span>
                  <span className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> 
                    Valid Rows: {validRows}
                  </span>
                  <span className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-500 mr-1" /> 
                    Invalid Rows: {invalidRows}
                  </span>
                </div>
                
                {invalidRows > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Validation Errors:</h4>
                    {mockValidationResults.filter(r => !r.isValid).map((error, index) => (
                      <div key={index} className="flex items-center text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Row {error.row}, Column {error.column}: {error.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleLink} disabled={!datasetName}>Link Dataset</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};