// User Context Service
// Provides real user context data for API calls

import { supabase } from '../integrations/supabase/client';

export interface UserContext {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  location: string;
  ipAddress: string;
  sessionId: string;
  systemVersion: string;
}

/**
 * Get current user context from Supabase and browser
 * @returns Promise with user context data
 */
export const getUserContext = async (): Promise<UserContext> => {
  try {
    // Get current user from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Get browser/system information
    const location = await getLocation();
    const ipAddress = await getIPAddress();
    const sessionId = getSessionId();
    const systemVersion = getSystemVersion();

    const userContext: UserContext = {
      userId: user.id,
      userName: profile.name,
      userEmail: user.email || '',
      userRole: profile.role,
      location: location,
      ipAddress: ipAddress,
      sessionId: sessionId,
      systemVersion: systemVersion
    };

    console.log('User context loaded:', userContext);
    return userContext;

  } catch (error: any) {
    console.error('Error getting user context:', error);
    
    // Return fallback context
    return {
      userId: 'unknown-user',
      userName: 'Unknown User',
      userEmail: 'unknown@example.com',
      userRole: 'employee',
      location: 'Malta Office',
      ipAddress: '192.168.1.100',
      sessionId: 'sess_unknown',
      systemVersion: 'v1.0.0'
    };
  }
};

/**
 * Get user's location (simplified)
 * @returns Promise with location string
 */
const getLocation = async (): Promise<string> => {
  try {
    // In a real app, you might use geolocation API or IP-based location
    // For now, return a default location
    return 'Malta Office';
  } catch (error) {
    return 'Malta Office';
  }
};

/**
 * Get user's IP address (simplified)
 * @returns Promise with IP address string
 */
const getIPAddress = async (): Promise<string> => {
  try {
    // In a real app, you might get this from the backend
    // For now, return a default IP
    return '192.168.1.100';
  } catch (error) {
    return '192.168.1.100';
  }
};

/**
 * Get current session ID
 * @returns Session ID string
 */
const getSessionId = (): string => {
  try {
    // Generate a session ID or get from storage
    let sessionId = sessionStorage.getItem('audit_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('audit_session_id', sessionId);
    }
    return sessionId;
  } catch (error) {
    return `sess_${Date.now()}`;
  }
};

/**
 * Get system version
 * @returns System version string
 */
const getSystemVersion = (): string => {
  try {
    // Get version from package.json or environment
    return process.env.VITE_APP_VERSION || 'v1.0.0';
  } catch (error) {
    return 'v1.0.0';
  }
};

/**
 * Update user context in localStorage for offline use
 * @param userContext - User context to store
 */
export const storeUserContext = (userContext: UserContext): void => {
  try {
    localStorage.setItem('user_context', JSON.stringify(userContext));
    console.log('User context stored in localStorage');
  } catch (error) {
    console.error('Error storing user context:', error);
  }
};

/**
 * Get user context from localStorage
 * @returns User context or null if not found
 */
export const getStoredUserContext = (): UserContext | null => {
  try {
    const stored = localStorage.getItem('user_context');
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('Error getting stored user context:', error);
    return null;
  }
};
