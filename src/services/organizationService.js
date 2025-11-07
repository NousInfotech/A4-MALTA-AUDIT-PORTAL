import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Get authorization header with Supabase access token
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No active session');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
}

/**
 * Create a new organization with admin user
 * @param {Object} data - Organization data
 * @param {string} data.title - Organization name
 * @param {string} data.adminName - Admin name
 * @param {string} data.adminEmail - Admin email
 * @param {string} data.adminPassword - Admin password
 * @returns {Promise<Object>} Created organization
 */
export async function createOrganization(data) {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}/organizations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create organization');
  }

  return response.json();
}

/**
 * Get all organizations (super-admin only)
 * @returns {Promise<Object>} Object with organizations array
 */
export async function getOrganizations() {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}/organizations`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch organizations');
  }

  return response.json();
}

/**
 * Get organization analytics (super-admin only)
 * @returns {Promise<Object>} Analytics data
 */
export async function getOrganizationAnalytics() {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}/organizations/analytics`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch analytics');
  }

  return response.json();
}

/**
 * Get organization by ID
 * @param {string} id - Organization ID
 * @returns {Promise<Object>} Organization object
 */
export async function getOrganizationById(id) {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}/organizations/${id}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch organization');
  }

  return response.json();
}

/**
 * Update organization
 * @param {string} id - Organization ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated organization
 */
export async function updateOrganization(id, data) {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}/organizations/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update organization');
  }

  return response.json();
}

