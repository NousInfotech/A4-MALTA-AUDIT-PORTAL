// src/types/journal.ts

export interface LineItem {
  id: string;
  account_id: string;
  account_name: string;
  description: string;
  amount: number;
  tax_amount: number;
  tax_rate: number;
  tax_type: string | null;
  type: "debit" | "credit";
}

export interface CustomField {
  id: string;
  name: string;
  value: string;
}

export interface JournalEntry {
  id: string;
  journal_date: string;
  currency: string;
  currency_rate: number;
  exchange_rate: number;
  note: string;
  reference: string;
  status: string;
  line_items: LineItem[];
  total_amount: number;
  balance: number;
  custom_fields: CustomField[];
  row_version: string;
  updated_by: string;
  created_by: string;
  updated_at: string;
  created_at: string;
}

export interface JournalEntriesResponse {
  status_code: number;
  status_code_class: string;
  status_message: string;
  data: JournalEntry[];
  links: {
    current: string;
    next: string | null;
    previous: string | null;
  };
  meta: {
    total_count: number;
    cursor: string;
  };
}