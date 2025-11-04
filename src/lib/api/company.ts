import { supabase } from "@/integrations/supabase/client";

export interface CreateCompanyPayload {
  name: string;
  registrationNumber?: string;
  address?: string;
  status?: "active" | "record";
  timelineStart?: string;
  timelineEnd?: string;
  supportingDocuments?: string[];
  shareHoldingCompanies?: Array<{
    companyId: string | { _id: string };
    sharePercentage: number;
  }>
}

export async function createCompany(clientId: string, payload: CreateCompanyPayload) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) throw new Error("Not authenticated");

  const response = await fetch(`${import.meta.env.VITE_APIURL}/api/client/${clientId}/company`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || "Failed to create company");
  }

  return response.json();
}

export async function fetchCompanies(clientId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) throw new Error("Not authenticated");

  const response = await fetch(`${import.meta.env.VITE_APIURL}/api/client/${clientId}/company`, {
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
  });

  if (!response.ok) throw new Error("Failed to fetch companies");
  return response.json();
}


