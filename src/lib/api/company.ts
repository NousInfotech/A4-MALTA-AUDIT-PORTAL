import axiosInstance from "../axiosInstance";

// ============================================
// Interfaces
// ============================================

export interface CreateCompanyPayload {
  name: string;
  registrationNumber?: string;
  address?: string;
  status?: "active" | "record";
  timelineStart?: string;
  timelineEnd?: string;
  supportingDocuments?: string[];
  totalShares?: number;
  industry?: string;
  description?: string;
  shareHoldingCompanies?: Array<{
    companyId: string | { _id: string };
    sharesData?: Array<{
      totalShares: number;
      shareClass: "A" | "B" | "C";
      shareType?: "Ordinary" | "Preferred";
    }>;
  }>;
}

export interface UpdateCompanyPayload extends Partial<CreateCompanyPayload> {
  representationalCompany?: Array<{
    companyId: string;
    role: string[];
  }>;
}

export interface ShareDataItem {
  totalShares: number;
  shareClass: "A" | "B" | "C";
  shareType?: "Ordinary" | "Preferred";
}

export interface AddShareHolderPersonPayload {
  personId: string;
  sharesData: ShareDataItem[];
}

export interface AddShareHolderCompanyPayload {
  companyId: string;
  sharesData: ShareDataItem[];
}

export interface UpdateShareHolderPayload {
  sharesData: ShareDataItem[];
}

export interface AddRepresentationPersonPayload {
  personId: string;
  role: string[];
}

export interface AddRepresentationCompanyPayload {
  companyId: string;
  role: string[];
}

export interface UpdateRepresentationPayload {
  role: string[];
}

export interface BulkShareHolderPersonPayload {
  persons: Array<{
    personId: string;
    sharesData: ShareDataItem[];
  }>;
}

export interface BulkShareHolderCompanyPayload {
  companies: Array<{
    companyId: string;
    sharesData: ShareDataItem[];
  }>;
}

export interface BulkRepresentationPersonPayload {
  persons: Array<{
    personId: string;
    role: string[];
  }>;
}

export interface BulkRepresentationCompanyPayload {
  companies: Array<{
    companyId: string;
    role: string[];
  }>;
}

// ============================================
// Constants
// ============================================

const BASE_URL = "/api/client";

// ============================================
// Basic Company CRUD Operations
// ============================================

export async function createCompany(clientId: string, payload: CreateCompanyPayload) {
  const response = await axiosInstance.post(`${BASE_URL}/${clientId}/company`, payload);
  return response.data;
}

export async function fetchCompanies(clientId: string) {
  const response = await axiosInstance.get(`${BASE_URL}/${clientId}/company`);
  return response.data;
}

export async function fetchCompanyById(clientId: string, companyId: string) {
  const response = await axiosInstance.get(`${BASE_URL}/${clientId}/company/${companyId}`);
  return response.data;
}

export async function updateCompany(
  clientId: string,
  companyId: string,
  payload: UpdateCompanyPayload
) {
  const response = await axiosInstance.put(`${BASE_URL}/${clientId}/company/${companyId}`, payload);
  return response.data;
}

export async function deleteCompany(clientId: string, companyId: string) {
  const response = await axiosInstance.delete(`${BASE_URL}/${clientId}/company/${companyId}`);
  return response.data;
}

export async function removeRepresentative(
  clientId: string,
  companyId: string,
  personId: string
) {
  const response = await axiosInstance.delete(
    `${BASE_URL}/${clientId}/company/${companyId}/representative/${personId}`
  );
  return response.data;
}

export async function getCompanyHierarchy(clientId: string, companyId: string) {
  const response = await axiosInstance.get(
    `${BASE_URL}/${clientId}/company/${companyId}/hierarchy`
  );
  return response.data;
}

// ============================================
// Share-Holder Routes - Person
// ============================================

/**
 * Update existing person shareholder (single)
 * PUT /:clientId/company/:companyId/share-holder/person/existing/:personId
 */
export async function updateShareHolderPersonExisting(
  clientId: string,
  companyId: string,
  personId: string,
  payload: UpdateShareHolderPayload
) {
  const response = await axiosInstance.put(
    `${BASE_URL}/${clientId}/company/${companyId}/share-holder/person/existing/${personId}`,
    payload
  );
  return response.data;
}

/**
 * Add new person shareholder (single)
 * POST /:clientId/company/:companyId/share-holder/person/new
 */
export async function addShareHolderPersonNew(
  clientId: string,
  companyId: string,
  payload: AddShareHolderPersonPayload
) {
  const response = await axiosInstance.post(
    `${BASE_URL}/${clientId}/company/${companyId}/share-holder/person/new`,
    payload
  );
  return response.data;
}

/**
 * Update existing person shareholders (bulk)
 * PUT /:clientId/company/:companyId/share-holder/person/existing/bulk
 */
export async function updateShareHolderPersonExistingBulk(
  clientId: string,
  companyId: string,
  payload: { personIds: string[] }
) {
  const response = await axiosInstance.put(
    `${BASE_URL}/${clientId}/company/${companyId}/share-holder/person/existing/bulk`,
    payload
  );
  return response.data;
}

/**
 * Add new person shareholders (bulk)
 * POST /:clientId/company/:companyId/share-holder/person/new/bulk
 */
export async function addShareHolderPersonNewBulk(
  clientId: string,
  companyId: string,
  payload: BulkShareHolderPersonPayload
) {
  const response = await axiosInstance.post(
    `${BASE_URL}/${clientId}/company/${companyId}/share-holder/person/new/bulk`,
    payload
  );
  return response.data;
}

// ============================================
// Share-Holder Routes - Company
// ============================================

/**
 * Update existing company shareholder (single)
 * PUT /:clientId/company/:companyId/share-holder/company/existing/:addingCompanyId
 */
export async function updateShareHolderCompanyExisting(
  clientId: string,
  companyId: string,
  addingCompanyId: string,
  payload: UpdateShareHolderPayload
) {
  const response = await axiosInstance.put(
    `${BASE_URL}/${clientId}/company/${companyId}/share-holder/company/existing/${addingCompanyId}`,
    payload
  );
  return response.data;
}

/**
 * Add new company shareholder (single)
 * POST /:clientId/company/:companyId/share-holder/company/new
 */
export async function addShareHolderCompanyNew(
  clientId: string,
  companyId: string,
  payload: AddShareHolderCompanyPayload
) {
  const response = await axiosInstance.post(
    `${BASE_URL}/${clientId}/company/${companyId}/share-holder/company/new`,
    payload
  );
  return response.data;
}

/**
 * Update existing company shareholders (bulk)
 * PUT /:clientId/company/:companyId/share-holder/company/existing/bulk
 */
export async function updateShareHolderCompanyExistingBulk(
  clientId: string,
  companyId: string,
  payload: { companyIds: string[] }
) {
  const response = await axiosInstance.put(
    `${BASE_URL}/${clientId}/company/${companyId}/share-holder/company/existing/bulk`,
    payload
  );
  return response.data;
}

/**
 * Add new company shareholders (bulk)
 * POST /:clientId/company/:companyId/share-holder/company/new/bulk
 */
export async function addShareHolderCompanyNewBulk(
  clientId: string,
  companyId: string,
  payload: BulkShareHolderCompanyPayload
) {
  const response = await axiosInstance.post(
    `${BASE_URL}/${clientId}/company/${companyId}/share-holder/company/new/bulk`,
    payload
  );
  return response.data;
}

// ============================================
// Representation Routes - Person
// ============================================

/**
 * Update existing person representation (single)
 * PUT /:clientId/company/:companyId/representation/person/existing/:personId
 */
export async function updateRepresentationPersonExisting(
  clientId: string,
  companyId: string,
  personId: string,
  payload: UpdateRepresentationPayload
) {
  const response = await axiosInstance.put(
    `${BASE_URL}/${clientId}/company/${companyId}/representation/person/existing/${personId}`,
    payload
  );
  return response.data;
}

/**
 * Add new person representation (single)
 * POST /:clientId/company/:companyId/representation/person/new
 */
export async function addRepresentationPersonNew(
  clientId: string,
  companyId: string,
  payload: AddRepresentationPersonPayload
) {
  const response = await axiosInstance.post(
    `${BASE_URL}/${clientId}/company/${companyId}/representation/person/new`,
    payload
  );
  return response.data;
}

/**
 * Update existing person representations (bulk)
 * PUT /:clientId/company/:companyId/representation/person/existing/bulk
 */
export async function updateRepresentationPersonExistingBulk(
  clientId: string,
  companyId: string,
  payload: { personIds: string[] }
) {
  const response = await axiosInstance.put(
    `${BASE_URL}/${clientId}/company/${companyId}/representation/person/existing/bulk`,
    payload
  );
  return response.data;
}

/**
 * Add new person representations (bulk)
 * POST /:clientId/company/:companyId/representation/person/new/bulk
 */
export async function addRepresentationPersonNewBulk(
  clientId: string,
  companyId: string,
  payload: BulkRepresentationPersonPayload
) {
  const response = await axiosInstance.post(
    `${BASE_URL}/${clientId}/company/${companyId}/representation/person/new/bulk`,
    payload
  );
  return response.data;
}

// ============================================
// Representation Routes - Company
// ============================================

/**
 * Update existing company representation (single)
 * PUT /:clientId/company/:companyId/representation/company/existing/:addingCompanyId
 */
export async function updateRepresentationCompanyExisting(
  clientId: string,
  companyId: string,
  addingCompanyId: string,
  payload: UpdateRepresentationPayload
) {
  const response = await axiosInstance.put(
    `${BASE_URL}/${clientId}/company/${companyId}/representation/company/existing/${addingCompanyId}`,
    payload
  );
  return response.data;
}

/**
 * Add new company representation (single)
 * POST /:clientId/company/:companyId/representation/company/new
 */
export async function addRepresentationCompanyNew(
  clientId: string,
  companyId: string,
  payload: AddRepresentationCompanyPayload
) {
  const response = await axiosInstance.post(
    `${BASE_URL}/${clientId}/company/${companyId}/representation/company/new`,
    payload
  );
  return response.data;
}

/**
 * Update existing company representations (bulk)
 * PUT /:clientId/company/:companyId/representation/company/existing/bulk
 */
export async function updateRepresentationCompanyExistingBulk(
  clientId: string,
  companyId: string,
  payload: { companyIds: string[] }
) {
  const response = await axiosInstance.put(
    `${BASE_URL}/${clientId}/company/${companyId}/representation/company/existing/bulk`,
    payload
  );
  return response.data;
}

/**
 * Add new company representations (bulk)
 * POST /:clientId/company/:companyId/representation/company/new/bulk
 */
export async function addRepresentationCompanyNewBulk(
  clientId: string,
  companyId: string,
  payload: BulkRepresentationCompanyPayload
) {
  const response = await axiosInstance.post(
    `${BASE_URL}/${clientId}/company/${companyId}/representation/company/new/bulk`,
    payload
  );
  return response.data;
}


