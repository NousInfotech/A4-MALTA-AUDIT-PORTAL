import { supabase } from "@/integrations/supabase/client";

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

// Setup 2FA: returns secret and QR code URL
export async function setup2FA() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/2fa/setup`, {
        method: 'POST',
        headers
    });
    if (!response.ok) throw new Error('Failed to initiate 2FA setup');
    return response.json(); // { message, qrCode, secret }
}

// Verify 2FA token to enable it
export async function verifyAndEnable2FA(token: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/2fa/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to verify token');
    }
    return response.json();
}

// Validate 2FA token (for login challenge)
export async function validate2FA(token: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/2fa/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Validation failed');
    }
    return response.json(); // { valid: boolean }
}

// Disable 2FA
export async function disable2FA() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/2fa/disable`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
    });
    if (!response.ok) throw new Error('Failed to disable 2FA');
    return response.json();
}
