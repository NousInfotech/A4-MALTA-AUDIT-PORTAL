import axiosInstance from "../axiosInstance";

export const getClientById = async (clientId: string) => {
    const response = await axiosInstance.get(`/api/users/client/${clientId}`);
    return response.data;
}