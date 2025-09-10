import axiosInstance from "../axiosInstance";

const API_BASE = '/api/pbc';

export const pbcApi = {
  // PBC Workflow endpoints
  async createPBCWorkflow(data: any) {
    const response = await axiosInstance.post(`${API_BASE}/`, data);
    return response.data;
  },

  async getPBCByEngagement(engagementId: string) {
    const response = await axiosInstance.get(`${API_BASE}/engagement/${engagementId}`);
    return response.data;
  },

  async updatePBCWorkflow(id: string, data: any) {
    const response = await axiosInstance.patch(`${API_BASE}/${id}`, data);
    return response.data;
  },

  async deletePBCWorkflow(id: string) {
    const response = await axiosInstance.delete(`${API_BASE}/${id}`);
    return response.data;
  },

  async getAllPBCWorkflows(params?: { status?: string, clientId?: string }) {
    const response = await axiosInstance.get(`${API_BASE}/`, { params });
    return response.data;
  },

  // Category endpoints
  async createCategory(data: any) {
    const response = await axiosInstance.post(`${API_BASE}/categories`, data);
    return response.data;
  },

  async getCategoriesByPBC(pbcId: string) {
    const response = await axiosInstance.get(`${API_BASE}/categories/pbc/${pbcId}`);
    return response.data;
  },

  async addQuestionToCategory(categoryId: string, data: any) {
    const response = await axiosInstance.post(`${API_BASE}/categories/${categoryId}/questions`, data);
    return response.data;
  },

  async updateQuestion(categoryId: string, questionIndex: number, data: any) {
    const response = await axiosInstance.patch(`${API_BASE}/categories/${categoryId}/questions/${questionIndex}`, data);
    return response.data;
  },

  async addDiscussion(categoryId: string, questionIndex: number, data: any) {
    const response = await axiosInstance.post(`${API_BASE}/categories/${categoryId}/questions/${questionIndex}/discussions`, data);
    return response.data;
  },

  async deleteCategory(categoryId: string) {
    const response = await axiosInstance.delete(`${API_BASE}/categories/${categoryId}`);
    return response.data;
  },
};