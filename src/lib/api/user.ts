import axiosInstance from "../axiosInstance";

export enum Role {
    EMPLOYEE = "employee",
    PARTNER = "partner",
    SENIOR_EMPLOYEE = "senior-employee",
    CLIENT = "client"
}

export const getClientById = async (clientId: string) => {
    const response = await axiosInstance.get(`/api/users/client/${clientId}`);
    return response.data;
}

export const createAdmin = async (name: string, email: string, password: string) => {
    const response = await axiosInstance.post(`/api/users/create/admin`, { name, email, password });
    return response.data;
}

export const createEmployee = async (role: Role, name: string, email: string, password: string) => {
    const response = await axiosInstance.post(`/api/users/create/${role}`, { name, email, password });
    return response.data;
}