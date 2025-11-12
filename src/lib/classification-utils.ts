/**
 * Utility functions for extracting grouping information from classification strings
 */

export interface ClassificationGroupings {
  grouping1?: string;
  grouping2?: string;
  grouping3?: string;
  grouping4?: string;
}

/**
 * Extracts grouping levels from a classification string
 * 
 * Example:
 * Input: "Assets > Non-current > Intangible assets > Intangible assets - Cost"
 * Output: {
 *   grouping1: "Assets",
 *   grouping2: "Non-current",
 *   grouping3: "Intangible assets",
 *   grouping4: "Intangible assets - Cost"
 * }
 * 
 * @param classification - The classification string to parse
 * @returns Object containing grouping1-4 values
 */
export function extractGroupingsFromClassification(classification: string): ClassificationGroupings {
  if (!classification) {
    return {};
  }

  // Split by " > " to get individual parts
  const parts = classification.split(' > ').map(part => part.trim());

  return {
    grouping1: parts[0] || undefined,
    grouping2: parts[1] || undefined,
    grouping3: parts[2] || undefined,
    grouping4: parts[3] || undefined,
  };
}

/**
 * Ensures a row has grouping fields, extracting from classification if necessary
 * 
 * @param row - The ETB row that may have missing grouping fields
 * @returns Row with guaranteed grouping fields (from row or extracted from classification)
 */
export function ensureRowGroupings<T extends { classification?: string; grouping1?: string; grouping2?: string; grouping3?: string; grouping4?: string }>(
  row: T
): T & ClassificationGroupings {
  // If all groupings exist, return row as-is
  if (row.grouping1 && row.grouping2 && row.grouping3 && row.grouping4) {
    return row as T & ClassificationGroupings;
  }

  // Extract groupings from classification
  const extracted = extractGroupingsFromClassification(row.classification || '');

  // Merge: prioritize existing row groupings over extracted ones
  return {
    ...row,
    grouping1: row.grouping1 || extracted.grouping1,
    grouping2: row.grouping2 || extracted.grouping2,
    grouping3: row.grouping3 || extracted.grouping3,
    grouping4: row.grouping4 || extracted.grouping4,
  };
}

