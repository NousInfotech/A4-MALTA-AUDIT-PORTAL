export interface AItem {
  test_id: string;
  area: string;
  details: string;
}

export interface BItem {
  id: string;
  test_id: string;
  type: string;
  severity: "critical";
  description: string;
  location: {
    page: number | null;
    section: string | null;
    note: string | null;
    line_hint: string | null;
  };
    reported_value?: number | string | null;
  expected_value?: number | string | null;
  difference?: number | null;
  reason: string;
  financial_impact: string;
  suggested_fix: string;
}

export interface CItem {
  id: string;
  test_id: string;
  type: string;
  severity: "regulatory" | "presentation";
  description: string;
  location: {
    page: number | null;
    section: string | null;
    note: string | null;
    line_hint: string | null;
  };
  impact: string;
  suggested_fix: string;
}

export interface ReconciliationTable {
  columns: string[];
  rows: { description: string; values: (string | number | null)[] }[];
}

export interface FSReviewOutput {
  A: { title: string; items: AItem[] };
  B: { title: string; items: BItem[] };
  C: { title: string; items: CItem[] };
  D: {
    title: string;
    tables: {
      retained_earnings: ReconciliationTable;
      borrowings: ReconciliationTable;
      deferred_tax: ReconciliationTable;
      equity: ReconciliationTable;
    };
  };
  E: { title: string; verdict: string };
}
