import axiosInstance from "../axiosInstance";

export const createSessionForSaltedge = async (userId: string) => {
  const response = await axiosInstance.post(`/api/saltedge/sessions`, {
    userId
  });
  return response.data;
};




export const createConnectSession = async (returnTo: string) => {
  const response = await axiosInstance.post(`/api/saltedge/sessions`, {
    returnTo
  });
  return response.data;
};

export const fetchConnections = async (customerId: string) => {
  const response = await axiosInstance.get(
    `/api/saltedge/customers/${customerId}/connections`
  );
  return response.data;
};

export const fetchAccounts = async (connectionId: string) => {
  const response = await axiosInstance.get(
    `/api/saltedge/connections/${connectionId}/accounts`
  );
  return response.data;
};

export const fetchTransactions = async (accountId:string, connectionId: string) => {
  const response = await axiosInstance.get(
    `/api/saltedge/connections/${connectionId}/accounts/${accountId}/transactions`
  );
  return response.data;
};







