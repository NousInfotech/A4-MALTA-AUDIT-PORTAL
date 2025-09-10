// const API_BASE = '/api/pbc';

// // Mock auth token - in real app this would come from auth context
// const getAuthHeaders = () => ({
//   'Authorization': `Bearer mock-token`,
//   'Content-Type': 'application/json',
// });

// export const pbcApi = {
//   // PBC Workflow endpoints
//   async createPBCWorkflow(data: any) {
//     const response = await fetch(`${API_BASE}/`, {
//       method: 'POST',
//       headers: getAuthHeaders(),
//       body: JSON.stringify(data),
//     });
//     return response.json();
//   },

//   async getPBCByEngagement(engagementId: string) {
//     const response = await fetch(`${API_BASE}/engagement/${engagementId}`, {
//       headers: getAuthHeaders(),
//     });
//     return response.json();
//   },

//   async updatePBCWorkflow(id: string, data: any) {
//     const response = await fetch(`${API_BASE}/${id}`, {
//       method: 'PATCH',
//       headers: getAuthHeaders(),
//       body: JSON.stringify(data),
//     });
//     return response.json();
//   },

//   async deletePBCWorkflow(id: string) {
//     const response = await fetch(`${API_BASE}/${id}`, {
//       method: 'DELETE',
//       headers: getAuthHeaders(),
//     });
//     return response.json();
//   },

//   async getAllPBCWorkflows(params?: { status?: string; clientId?: string }) {
//     const queryString = params ? new URLSearchParams(params).toString() : '';
//     const response = await fetch(`${API_BASE}/${queryString ? `?${queryString}` : ''}`, {
//       headers: getAuthHeaders(),
//     });
//     return response.json();
//   },

//   // Category endpoints
//   async createCategory(data: any) {
//     const response = await fetch(`${API_BASE}/categories`, {
//       method: 'POST',
//       headers: getAuthHeaders(),
//       body: JSON.stringify(data),
//     });
//     return response.json();
//   },

//   async getCategoriesByPBC(pbcId: string) {
//     const response = await fetch(`${API_BASE}/categories/pbc/${pbcId}`, {
//       headers: getAuthHeaders(),
//     });
//     return response.json();
//   },

//   async addQuestionToCategory(categoryId: string, data: any) {
//     const response = await fetch(`${API_BASE}/categories/${categoryId}/questions`, {
//       method: 'POST',
//       headers: getAuthHeaders(),
//       body: JSON.stringify(data),
//     });
//     return response.json();
//   },

//   async updateQuestion(categoryId: string, questionIndex: number, data: any) {
//     const response = await fetch(`${API_BASE}/categories/${categoryId}/questions/${questionIndex}`, {
//       method: 'PATCH',
//       headers: getAuthHeaders(),
//       body: JSON.stringify(data),
//     });
//     return response.json();
//   },

//   async addDiscussion(categoryId: string, questionIndex: number, data: any) {
//     const response = await fetch(`${API_BASE}/categories/${categoryId}/questions/${questionIndex}/discussions`, {
//       method: 'POST',
//       headers: getAuthHeaders(),
//       body: JSON.stringify(data),
//     });
//     return response.json();
//   },

//   async deleteCategory(categoryId: string) {
//     const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
//       method: 'DELETE',
//       headers: getAuthHeaders(),
//     });
//     return response.json();
//   },
// };