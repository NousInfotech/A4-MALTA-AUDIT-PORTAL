// import React, { useState, useMemo, ChangeEvent } from 'react';
// import { ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, Search } from 'lucide-react';

// interface ConnectionDetailTableProps<T extends Record<string, any>> {
//   title: string;
//   data: T[] | null;
//   isLoading: boolean;
//   error: string | null;
//   emptyMessage?: string;
// }

// // --- Constants for Pagination ---
// const ROWS_PER_PAGE = 5;

// // --- Helper for Date Formatting ---
// const formatDate = (dateString: string): string => {
//   try {
//     const date = new Date(dateString);
//     if (isNaN(date.getTime())) {
//       return dateString;
//     }
//     return date.toLocaleDateString('en-CA', {
//       year: 'numeric',
//       month: '2-digit',
//       day: '2-digit'
//     });
//   } catch (e) {
//     return dateString;
//   }
// };

// // --- Regex to detect common date/datetime string patterns ---
// const DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

// // --- ComplexDataRenderer for the FULL detailed expanded row ONLY (shows raw JSON) ---
// interface ComplexDataRendererProps {
//   data: any;
// }

// const ComplexDataRenderer: React.FC<ComplexDataRendererProps> = ({ data }) => {
//   if (data === null || data === undefined) {
//     return <span className='text-gray-400 italic'>null</span>;
//   }

//   if (Array.isArray(data) || (typeof data === 'object' && Object.keys(data).length > 0)) {
//     return (
//       <div className='max-h-60 overflow-auto rounded bg-gray-50 p-2 text-xs'>
//         <pre className='whitespace-pre-wrap'>{JSON.stringify(data, null, 2)}</pre>
//       </div>
//     );
//   }

//   return <span>{String(data)}</span>;
// };

// // --- Helper function to flatten an object/array into dot-notation keys ---
// const flattenObject = (obj: any, prefix = '', result: { [key: string]: any } = {}): { [key: string]: any } => {
//   if (obj === null || obj === undefined) {
//     return result;
//   }

//   if (Array.isArray(obj)) {
//     obj.forEach((item, index) => {
//       if (typeof item === 'object' && item !== null) {
//         flattenObject(item, `${prefix}[${index}].`, result);
//       } else {
//         result[`${prefix}[${index}]`] = item;
//       }
//     });
//   } else if (typeof obj === 'object') {
//     for (const key in obj) {
//       if (Object.prototype.hasOwnProperty.call(obj, key)) {
//         const value = obj[key];
//         const newKey = prefix ? `${prefix}${key}` : key;

//         if (typeof value === 'object' && value !== null && (Object.keys(value).length > 0 || Array.isArray(value))) {
//           flattenObject(value, `${newKey}.`, result);
//         } else {
//           result[newKey] = value;
//         }
//       }
//     }
//   }
//   return result;
// };

// // --- Helper to generate dynamic table data (headers and flattened rows) ---
// const generateDynamicTableData = <T extends Record<string, any>>(rawData: T[]) => {
//   const allFlattenedRows: { original: T; flattened: { [key: string]: any } }[] = [];
//   const uniqueHeaders = new Set<string>();

//   rawData.forEach(row => {
//     const flattened = flattenObject(row);
//     allFlattenedRows.push({ original: row, flattened });
//     Object.keys(flattened).forEach(key => uniqueHeaders.add(key));
//   });

//   const headers = Array.from(uniqueHeaders).sort();

//   return { headers, flattenedRows: allFlattenedRows };
// };

// // --- Component to render table cell content for the main table rows (flattened values) ---
// interface TableCellContentProps {
//   value: any;
//   maxLength?: number;
// }

// const TableCellContent: React.FC<TableCellContentProps> = ({
//   value,
//   maxLength = 100 // Default max length before truncation
// }) => {
//   const [showFull, setShowFull] = useState(false);

//   if (value === null || value === undefined) {
//     return <span className='text-gray-400 italic'>—</span>;
//   }

//   let displayValue: string;

//   if (typeof value === 'string' && DATE_REGEX.test(value)) {
//     displayValue = formatDate(value);
//   } else if (typeof value === 'object') {
//     // For objects in flattened view, stringify them
//     displayValue = JSON.stringify(value);
//   } else {
//     displayValue = String(value);
//   }

//   const isLong = displayValue.length > maxLength;

//   if (!isLong) {
//     // If not long, just display the value
//     return <span className="whitespace-nowrap">{displayValue}</span>;
//   }

//   // If long, display truncated with 'Show More/Less'
//   return (
//     <div className='relative'> {/* Use relative for absolute positioning of button if needed */}
//       <span className="block whitespace-nowrap overflow-hidden text-ellipsis max-w-xs" style={{ maxWidth: showFull ? 'none' : '200px' }}> {/* Adjust max-width as needed */}
//         {showFull ? displayValue : `${displayValue.substring(0, maxLength)}...`}
//       </span>
//       <button
//         type='button'
//         className='inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground
//                    bg-transparent hover:bg-gray-100 h-5 px-1 py-0 text-gray-600 hover:underline'
//         onClick={() => setShowFull(!showFull)}
//       >
//         {showFull ? 'Show Less' : 'Show More'}
//       </button>
//     </div>
//   );
// };

// export function ConnectionDetailTable<T extends Record<string, any>>({
//   title,
//   data,
//   isLoading,
//   error,
//   emptyMessage = 'No data available.'
// }: ConnectionDetailTableProps<T>) {
//   const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
//   const [currentPage, setCurrentPage] = useState(1);
//   const [searchTerm, setSearchTerm] = useState('');

//   const { headers, flattenedRows } = useMemo(() => {
//     setCurrentPage(1); // Reset page on data change
//     setSearchTerm(''); // Reset search term on data change
//     if (!data || data.length === 0) {
//       return { headers: [], flattenedRows: [] };
//     }
//     return generateDynamicTableData(data);
//   }, [data]);

//   const filteredRows = useMemo(() => {
//     if (!searchTerm) {
//       return flattenedRows;
//     }
//     const lowercasedSearchTerm = searchTerm.toLowerCase();
//     return flattenedRows.filter(rowWrapper =>
//       Object.values(rowWrapper.flattened).some(value =>
//         String(value).toLowerCase().includes(lowercasedSearchTerm)
//       )
//     );
//   }, [flattenedRows, searchTerm]);

//   const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
//   const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
//   const endIndex = startIndex + ROWS_PER_PAGE;
//   const currentRows = filteredRows.slice(startIndex, endIndex);

//   const goToNextPage = () => {
//     setCurrentPage(prev => Math.min(prev + 1, totalPages));
//   };

//   const goToPreviousPage = () => {
//     setCurrentPage(prev => Math.max(prev - 1, 1));
//   };

//   const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
//     setSearchTerm(event.target.value);
//     setCurrentPage(1); // Reset to first page on new search
//   };

//   if (isLoading) {
//     return (
//       <div className='space-y-4'>
//         <h3 className='text-xl font-semibold text-gray-800'>{title}</h3>
//         <div className='h-10 w-full rounded-md bg-gray-200 animate-pulse' />
//         <div className='h-10 w-full rounded-md bg-gray-200 animate-pulse' />
//         <div className='h-10 w-full rounded-md bg-gray-200 animate-pulse' />
//         <div className='h-10 w-full rounded-md bg-gray-200 animate-pulse' />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className='space-y-4'>
//         <h3 className='text-xl font-semibold text-red-700'>{title}</h3>
//         <p className='text-red-500'>Error fetching data: {error}</p>
//       </div>
//     );
//   }

//   if (!data || data.length === 0 || headers.length === 0) {
//     return (
//       <div className='space-y-4'>
//         <h3 className='text-xl font-semibold text-gray-800'>{title}</h3>
//         <p className='text-gray-500'>{emptyMessage}</p>
//       </div>
//     );
//   }

//   const toggleRowExpansion = (rowIndex: number) => {
//     const newExpanded = new Set(expandedRows);
//     if (newExpanded.has(rowIndex)) {
//       newExpanded.delete(rowIndex);
//     } else {
//       newExpanded.add(rowIndex);
//     }
//     setExpandedRows(newExpanded);
//   };

//   const hasExpandableContentInAnyRow = data.some((row) =>
//     Object.values(row).some(
//       (value) => (typeof value === 'object' && value !== null && Object.keys(value).length > 0) ||
//                    (Array.isArray(value) && value.length > 0)
//     )
//   );

//   return (
//     <div className='rounded-md border bg-white p-4 shadow-sm'>
//       <div className='mb-4 flex items-center justify-between'>
//         <h3 className='text-xl font-semibold text-gray-800'>{title}</h3>
//         <span className='inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'>
//           {filteredRows.length} record{filteredRows.length !== 1 ? 's' : ''} {searchTerm && `(filtered from ${flattenedRows.length})`}
//         </span>
//       </div>

//       {/* Search Input */}
//       <div className="relative mb-4">
//         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
//         <input
//           type="text"
//           placeholder={`Search ${title.toLowerCase()}...`}
//           value={searchTerm}
//           onChange={handleSearchChange}
//           className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
//         />
//       </div>

//       <div className='overflow-x-auto'>
//         <table className='w-full caption-bottom text-sm table-auto'>
//           <caption className='mt-4 text-sm text-gray-500'>
//             {`A list of ${title.toLowerCase()}.`}
//           </caption>
//           <thead className='[&_tr]:border-b'>
//             <tr className='border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted'>
//               {hasExpandableContentInAnyRow && <th className='h-12 px-4 text-left align-middle font-medium text-muted-foreground w-10 min-w-[40px]'></th>}
//               {headers.map((header) => (
//                 <th key={header} className='h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap min-w-[120px]'>
//                   {header.replace(/([.[\]])/g, ' $1 ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\[ (\d+) \]/g, '[$1]').trim()}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody className='[&_tr:last-child]:border-0'>
//             {currentRows.length > 0 ? (
//               currentRows.map((rowWrapper, index) => {
//                 const uniqueRowKey = rowWrapper.original.id || `row-${startIndex + index}`;
//                 const originalRowIndex = startIndex + index;
//                 return (
//                   <React.Fragment key={uniqueRowKey}>
//                     <tr
//                       className={`border-b transition-colors hover:bg-gray-50 ${expandedRows.has(originalRowIndex) ? 'bg-gray-100' : ''}`}
//                     >
//                       {hasExpandableContentInAnyRow && (
//                         <td className='p-4 align-top w-10'>
//                           {Object.values(rowWrapper.original).some(
//                             (value) => (typeof value === 'object' && value !== null && Object.keys(value).length > 0) ||
//                                          (Array.isArray(value) && value.length > 0)
//                           ) && (
//                             <button
//                               type='button'
//                               className='inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground
//                                          h-6 w-6 p-0 hover:bg-gray-200'
//                               onClick={() => toggleRowExpansion(originalRowIndex)}
//                               title={expandedRows.has(originalRowIndex) ? 'Collapse details' : 'Expand details'}
//                             >
//                               {expandedRows.has(originalRowIndex) ? (
//                                 <ChevronDown className='h-4 w-4' />
//                               ) : (
//                                 <ChevronRight className='h-4 w-4' />
//                               )}
//                             </button>
//                           )}
//                         </td>
//                       )}
//                       {headers.map((header) => (
//                         <td key={header} className='p-4 align-top max-w-xs'>
//                           <TableCellContent value={rowWrapper.flattened[header]} maxLength={100} /> {/* Re-added maxLength */}
//                         </td>
//                       ))}
//                     </tr>

//                     {expandedRows.has(originalRowIndex) && (
//                       <tr>
//                         <td
//                           colSpan={headers.length + (hasExpandableContentInAnyRow ? 1 : 0)}
//                           className='bg-gray-50 p-4'
//                         >
//                           <div className='space-y-3'>
//                             <h4 className='font-medium text-gray-700'>
//                               Detailed View (Original Raw JSON)
//                             </h4>
//                             <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
//                               {Object.keys(rowWrapper.original).map((originalKey) => (
//                                 <div key={originalKey} className='space-y-1'>
//                                   <div className='text-sm font-medium text-gray-600'>
//                                     {originalKey.charAt(0).toUpperCase() +
//                                       originalKey.slice(1).replace(/([A-Z])/g, ' $1')}
//                                   </div>
//                                   <div className='text-sm'>
//                                     <ComplexDataRenderer data={rowWrapper.original[originalKey]} />
//                                   </div>
//                                 </div>
//                               ))}
//                             </div>
//                           </div>
//                         </td>
//                       </tr>
//                     )}
//                   </React.Fragment>
//                 );
//               })
//             ) : (
//               <tr>
//                 <td colSpan={headers.length + (hasExpandableContentInAnyRow ? 1 : 0)} className="text-center py-4 text-gray-500">
//                   No matching records found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Pagination Controls */}
//       {totalPages > 1 && (
//         <div className="flex items-center justify-end space-x-2 py-4">
//           <button
//             type="button"
//             className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-gray-100 h-9 px-3 border border-gray-200"
//             onClick={goToPreviousPage}
//             disabled={currentPage === 1}
//           >
//             <ChevronLeft className="mr-2 h-4 w-4" /> Previous
//           </button>
//           <span className="text-sm text-gray-600">
//             Page {currentPage} of {totalPages}
//           </span>
//           <button
//             type="button"
//             className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-gray-100 h-9 px-3 border border-gray-200"
//             onClick={goToNextPage}
//             disabled={currentPage === totalPages}
//           >
//             Next <ChevronRightIcon className="ml-2 h-4 w-4" />
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// ###############################################################################################################

import React, { useState, useMemo, ChangeEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Search,
} from "lucide-react";

interface ConnectionDetailTableProps<T extends Record<string, any>> {
  title: string;
  data: T[] | null;
  isLoading: boolean;
  error: string | null;
  emptyMessage?: string;
}

// --- Constants for Pagination ---
const ROWS_PER_PAGE = 5;

// --- Helper for Date Formatting ---
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
};

// --- Regex to detect common date/datetime string patterns ---
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

// --- ComplexDataRenderer for the FULL detailed expanded row ONLY (shows raw JSON) ---
interface ComplexDataRendererProps {
  data: any;
}

const ComplexDataRenderer: React.FC<ComplexDataRendererProps> = ({ data }) => {
  if (data === null || data === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  if (
    Array.isArray(data) ||
    (typeof data === "object" && Object.keys(data).length > 0)
  ) {
    return (
      <div className="max-h-60 overflow-auto rounded bg-gray-50 p-2 text-xs">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return <span>{String(data)}</span>;
};

// --- Helper function to flatten an object/array into dot-notation keys ---
const flattenObject = (
  obj: any,
  prefix = "",
  result: { [key: string]: any } = {}
): { [key: string]: any } => {
  if (obj === null || obj === undefined) {
    return result;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === "object" && item !== null) {
        flattenObject(item, `${prefix}[${index}].`, result);
      } else {
        result[`${prefix}[${index}]`] = item;
      }
    });
  } else if (typeof obj === "object") {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}${key}` : key;

        if (
          typeof value === "object" &&
          value !== null &&
          (Object.keys(value).length > 0 || Array.isArray(value))
        ) {
          flattenObject(value, `${newKey}.`, result);
        } else {
          result[newKey] = value;
        }
      }
    }
  }
  return result;
};

// --- Helper to generate dynamic table data (headers and flattened rows) ---
const generateDynamicTableData = <T extends Record<string, any>>(
  rawData: T[]
) => {
  const allFlattenedRows: { original: T; flattened: { [key: string]: any } }[] =
    [];
  const uniqueHeaders = new Set<string>();

  rawData.forEach((row) => {
    const flattened = flattenObject(row);
    allFlattenedRows.push({ original: row, flattened });
    Object.keys(flattened).forEach((key) => uniqueHeaders.add(key));
  });

  const headers = Array.from(uniqueHeaders).sort();

  return { headers, flattenedRows: allFlattenedRows };
};

// --- Component to render table cell content for the main table rows (flattened values) ---
interface TableCellContentProps {
  value: any;
  maxLength?: number;
}

const TableCellContent: React.FC<TableCellContentProps> = ({
  value,
  maxLength = 100, // Default max length before truncation
}) => {
  const [showFull, setShowFull] = useState(false);

  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">—</span>;
  }

  let displayValue: string;

  if (typeof value === "string" && DATE_REGEX.test(value)) {
    displayValue = formatDate(value);
  } else if (typeof value === "object") {
    // For objects in flattened view, stringify them
    displayValue = JSON.stringify(value);
  } else {
    displayValue = String(value);
  }

  const isLong = displayValue.length > maxLength;

  if (!isLong) {
    // If not long, just display the value in a single line
    return <span className="whitespace-nowrap">{displayValue}</span>;
  }

  // If long, display truncated with 'Show More/Less'
  return (
    <div className="relative">
      <span
        className={
          showFull
            ? "block whitespace-normal min-w-[480px]" // Added min-w for readability when expanded. 480px is approx 60-70 characters wide.
            : "block whitespace-nowrap overflow-hidden text-ellipsis max-w-xs"
        }
      >
        {showFull ? displayValue : `${displayValue.substring(0, maxLength)}...`}
      </span>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground
                   bg-transparent hover:bg-gray-100 h-5 px-1 py-0 text-gray-600 hover:underline"
        onClick={() => setShowFull(!showFull)}
      >
        {showFull ? "Show Less" : "Show More"}
      </button>
    </div>
  );
};

export function ConnectionDetailTable<T extends Record<string, any>>({
  title,
  data,
  isLoading,
  error,
  emptyMessage = "No data available.",
}: ConnectionDetailTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const { headers, flattenedRows } = useMemo(() => {
    setCurrentPage(1); // Reset page on data change
    setSearchTerm(""); // Reset search term on data change
    if (!data || data.length === 0) {
      return { headers: [], flattenedRows: [] };
    }
    return generateDynamicTableData(data);
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) {
      return flattenedRows;
    }
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return flattenedRows.filter((rowWrapper) =>
      Object.values(rowWrapper.flattened).some((value) =>
        String(value).toLowerCase().includes(lowercasedSearchTerm)
      )
    );
  }, [flattenedRows, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentRows = filteredRows.slice(startIndex, endIndex);

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
        <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
        <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
        <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-red-700">{title}</h3>
        <p className="text-red-500">Error fetching data: {error}</p>
      </div>
    );
  }

  if (!data || data.length === 0 || headers.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const toggleRowExpansion = (rowIndex: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowIndex)) {
      newExpanded.delete(rowIndex);
    } else {
      newExpanded.add(rowIndex);
    }
    setExpandedRows(newExpanded);
  };

  const hasExpandableContentInAnyRow = data.some((row) =>
    Object.values(row).some(
      (value) =>
        (typeof value === "object" &&
          value !== null &&
          Object.keys(value).length > 0) ||
        (Array.isArray(value) && value.length > 0)
    )
  );

  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          {filteredRows.length} record{filteredRows.length !== 1 ? "s" : ""}{" "}
          {searchTerm && `(filtered from ${flattenedRows.length})`}
        </span>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${title.toLowerCase()}...`}
          value={searchTerm}
          onChange={handleSearchChange}
          className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm table-auto">
          {" "}
          {/* Reverted to table-auto */}
          <caption className="mt-4 text-sm text-gray-500">
            {`A list of ${title.toLowerCase()}.`}
          </caption>
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              {hasExpandableContentInAnyRow && (
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-10 min-w-[40px]"></th>
              )}
              {headers.map((header) => (
                <th
                  key={header}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap min-w-[120px]"
                >
                  {header
                    .replace(/([.[\]])/g, " $1 ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())
                    .replace(/\[ (\d+) \]/g, "[$1]")
                    .trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {currentRows.length > 0 ? (
              currentRows.map((rowWrapper, index) => {
                const uniqueRowKey =
                  rowWrapper.original.id || `row-${startIndex + index}`;
                const originalRowIndex = startIndex + index;
                return (
                  <React.Fragment key={uniqueRowKey}>
                    <tr
                      className={`border-b transition-colors hover:bg-gray-50 ${
                        expandedRows.has(originalRowIndex) ? "bg-gray-100" : ""
                      }`}
                    >
                      {hasExpandableContentInAnyRow && (
                        <td className="p-4 align-top w-10">
                          {Object.values(rowWrapper.original).some(
                            (value) =>
                              (typeof value === "object" &&
                                value !== null &&
                                Object.keys(value).length > 0) ||
                              (Array.isArray(value) && value.length > 0)
                          ) && (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground
                                         h-6 w-6 p-0 hover:bg-gray-200"
                              onClick={() =>
                                toggleRowExpansion(originalRowIndex)
                              }
                              title={
                                expandedRows.has(originalRowIndex)
                                  ? "Collapse details"
                                  : "Expand details"
                              }
                            >
                              {expandedRows.has(originalRowIndex) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
                      )}
                      {headers.map((header) => (
                        <td key={header} className="p-4 align-top min-w-sm">
                          {" "}
                          {/* min-w-sm still provides a good baseline for the column */}
                          <TableCellContent
                            value={rowWrapper.flattened[header]}
                            maxLength={100}
                          />
                        </td>
                      ))}
                    </tr>

                    {expandedRows.has(originalRowIndex) && (
                      <tr>
                        <td
                          colSpan={
                            headers.length +
                            (hasExpandableContentInAnyRow ? 1 : 0)
                          }
                          className="bg-gray-50 p-4"
                        >
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-700">
                              Detailed View (Original Raw JSON)
                            </h4>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {Object.keys(rowWrapper.original).map(
                                (originalKey) => (
                                  <div key={originalKey} className="space-y-1">
                                    <div className="text-sm font-medium text-gray-600">
                                      {originalKey.charAt(0).toUpperCase() +
                                        originalKey
                                          .slice(1)
                                          .replace(/([A-Z])/g, " $1")}
                                    </div>
                                    <div className="text-sm">
                                      <ComplexDataRenderer
                                        data={rowWrapper.original[originalKey]}
                                      />
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={
                    headers.length + (hasExpandableContentInAnyRow ? 1 : 0)
                  }
                  className="text-center py-4 text-gray-500"
                >
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-gray-100 h-9 px-3 border border-gray-200"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none hover:bg-gray-100 h-9 px-3 border border-gray-200"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            Next <ChevronRightIcon className="ml-2 h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
