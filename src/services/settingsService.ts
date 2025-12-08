import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = import.meta.env.VITE_APIURL ? `${import.meta.env.VITE_APIURL}/api` : 'http://localhost:8000/api';

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

// --- Org Settings ---

export async function getOrgSettings() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/settings/org`, { headers });
    if (!response.ok) throw new Error('Failed to fetch org settings');
    return response.json();
}

export async function updateOrgSettings(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/settings/org`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update org settings');
    return response.json();
}

// --- User Settings ---

export async function getUserSettings() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/settings/user`, { headers });
    if (!response.ok) throw new Error('Failed to fetch user settings');
    return response.json();
}

export async function updateUserSettings(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/settings/user`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update user settings');
    return response.json();
}
