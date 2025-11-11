import { useState, useEffect, useCallback } from "react";
import { getClientById } from "@/lib/api/user";

interface Client {
  user_id: string;
  name: string;
  company_name: string;
  company_number?: string;
  industry?: string;
  company_summary?: string;
  email: string;
  role: string;
  status: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface UseClientReturn {
  client: Client | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useClient = (clientId: string | undefined): UseClientReturn => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    if (!clientId) {
      setClient(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getClientById(clientId);
      
      if (response.success) {
        setClient(response.client);
      } else {
        setError(response.error || "Failed to fetch client");
      }
    } catch (err: any) {
      console.error("Error fetching client:", err);
      setError(err.message || "Failed to fetch client");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return {
    client,
    loading,
    error,
    refetch: fetchClient,
  };
};