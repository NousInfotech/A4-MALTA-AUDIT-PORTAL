export interface Workbook {
  id: string;
  name: string;
  uploadedDate: string;
  version: string;
  lastModified?: string;
  lastModifiedBy?: string;
  previousVersion?: string;
  fileData?: any;
}

export interface SheetData {
  [sheetName: string]: string[][];
}

export interface Selection {
  sheet: string;
  start: { row: number; col: number };
  end: { row: number; col: number };
}

export interface Mapping {
  id: string;
  sheet: string;
  start: { row: number; col: number };
  end: { row: number; col: number };
  destinationField: string;
  transform?: string;
  validation?: string;
  color: string;
}

// export interface NamedRange {
//   name: string;
//   range: string;
// }

export interface NamedRange {
  id: string; // Add an ID for easy management
  name: string;
  range: string; // e.g., "Balance Sheet!B2:C3"
}

export interface DatasetMapping {
  id: string;
  sheetName: string;
  datasetName: string;
  headerRow: number;
  keyColumn: string;
  columnMappings: { [key: string]: string };
  filters?: { [key: string]: any };
  validations?: { [key: string]: any };
}

export interface FieldDestination {
  field: string;
  transform?: string;
}

export interface DatasetDestination {
  dataset: string;
  keyColumn?: string;
  mappings?: { [key: string]: string };
}

// Update the WorkbookRule to use the discriminated union
export interface WorkbookRule {
  id: string;
  name: string;
  rules: {
    source: {
      type: 'named_range' | 'sheet' | 'table';
      name: string;
    };
    destinationType: 'field' | 'dataset';
    destination: FieldDestination | DatasetDestination;
  }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  row?: number;
  column?: string;
}
