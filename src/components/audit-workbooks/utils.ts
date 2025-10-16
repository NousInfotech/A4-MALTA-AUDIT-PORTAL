// utils.ts
export const zeroIndexToExcelCol = (colIndex: number): string => {
  let colLetter = "";
  let tempColIndex = colIndex;

  do {
    const remainder = tempColIndex % 26;
    colLetter = String.fromCharCode(65 + remainder) + colLetter;
    tempColIndex = Math.floor(tempColIndex / 26) - 1;
  } while (tempColIndex >= 0);

  return colLetter;
};

export const excelColToZeroIndex = (colLetter: string): number => {
  let result = 0;
  for (let i = 0; i < colLetter.length; i++) {
    result = result * 26 + (colLetter.charCodeAt(i) - "A".charCodeAt(0) + 1);
  }
  return result - 1; // Convert to 0-indexed
};

// Function to parse an Excel range like "Sheet1!A1:B5"
export const parseExcelRange = (range: string) => {
  const parts = range.split('!');
  const sheetName = parts.length > 1 ? parts[0] : null; // Sheet name might not always be present in address
  const cellRange = parts.length > 1 ? parts[1] : parts[0];

  const cellParts = cellRange.split(':');
  const startCell = cellParts[0];
  const endCell = cellParts.length > 1 ? cellParts[1] : startCell;

  const startColLetter = startCell.match(/[A-Z]+/)?.[0] || 'A';
  const startRowNumber = parseInt(startCell.match(/\d+/)?.[0] || '1', 10);
  
  const endColLetter = endCell.match(/[A-Z]+/)?.[0] || 'A';
  const endRowNumber = parseInt(endCell.match(/\d+/)?.[0] || '1', 10);

  return {
    sheetName,
    start: {
      row: startRowNumber, // 1-indexed Excel row
      col: excelColToZeroIndex(startColLetter) // 0-indexed column
    },
    end: {
      row: endRowNumber, // 1-indexed Excel row
      col: excelColToZeroIndex(endColLetter) // 0-indexed column
    }
  };
};