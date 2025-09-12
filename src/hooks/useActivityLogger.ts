import { useCallback } from 'react';
import { employeeLogApi } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ActivityLogData {
  action: string;
  details: string;
  ipAddress?: string;
  location?: string;
  deviceInfo?: string;
  status?: 'SUCCESS' | 'FAIL';
}

export const useActivityLogger = () => {
  const { toast } = useToast();

  const logActivity = useCallback(async (logData: ActivityLogData) => {
    try {
      // Get current user info
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Failed to get user for logging:', authError);
        return;
      }

      // Get user profile for name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      // Get client IP and user agent (basic implementation)
      const ipAddress = 'Unknown'; // In a real app, you'd get this from headers
      const userAgent = navigator.userAgent;
      const location = 'Unknown'; // Could be enhanced with geolocation

      const fullLogData = {
        employeeId: user.id,
        employeeName: profile?.name || user.email?.split('@')[0] || 'Unknown User',
        employeeEmail: user.email || 'unknown@example.com',
        action: logData.action,
        details: logData.details,
        ipAddress: logData.ipAddress || ipAddress,
        location: logData.location || location,
        deviceInfo: logData.deviceInfo || userAgent,
        status: logData.status || 'SUCCESS',
      };

      console.log('📝 Logging employee activity:', fullLogData);
      
      await employeeLogApi.create(fullLogData);
      
      console.log('✅ Activity logged successfully');
    } catch (error) {
      console.error('❌ Failed to log activity:', error);
      // Don't show toast to avoid interrupting user experience
      // toast({
      //   title: "Logging Error",
      //   description: "Failed to log activity",
      //   variant: "destructive",
      // });
    }
  }, [toast]);

  // Predefined logging functions for common actions
  const logLogin = useCallback((details: string = 'Employee logged into the system') => {
    return logActivity({
      action: 'LOGIN',
      details,
    });
  }, [logActivity]);

  const logLogout = useCallback((details: string = 'Employee logged out of the system') => {
    return logActivity({
      action: 'LOGOUT',
      details,
    });
  }, [logActivity]);

  const logViewDashboard = useCallback((details: string = 'Employee viewed the dashboard') => {
    return logActivity({
      action: 'VIEW_DASHBOARD',
      details,
    });
  }, [logActivity]);

  const logViewClient = useCallback((clientName: string, details?: string) => {
    return logActivity({
      action: 'VIEW_CLIENT_FILE',
      details: details || `Employee viewed client: ${clientName}`,
    });
  }, [logActivity]);

  const logCreateEngagement = useCallback((engagementTitle: string, clientName: string) => {
    return logActivity({
      action: 'CREATE_ENGAGEMENT',
      details: `Employee created engagement "${engagementTitle}" for client "${clientName}"`,
    });
  }, [logActivity]);

  const logUpdateEngagement = useCallback((engagementTitle: string, changes: string) => {
    return logActivity({
      action: 'UPDATE_ENGAGEMENT',
      details: `Employee updated engagement "${engagementTitle}": ${changes}`,
    });
  }, [logActivity]);

  const logCreateClient = useCallback((clientName: string) => {
    return logActivity({
      action: 'CREATE_CLIENT',
      details: `Employee created new client: ${clientName}`,
    });
  }, [logActivity]);

  const logUpdateClient = useCallback((clientName: string, changes: string) => {
    return logActivity({
      action: 'UPDATE_CLIENT',
      details: `Employee updated client "${clientName}": ${changes}`,
    });
  }, [logActivity]);

  const logUploadDocument = useCallback((documentName: string, engagementTitle?: string) => {
    return logActivity({
      action: 'UPLOAD_DOCUMENT',
      details: engagementTitle 
        ? `Employee uploaded document "${documentName}" for engagement "${engagementTitle}"`
        : `Employee uploaded document: ${documentName}`,
    });
  }, [logActivity]);

  const logDeleteDocument = useCallback((documentName: string, engagementTitle?: string) => {
    return logActivity({
      action: 'DELETE_DOCUMENT',
      details: engagementTitle 
        ? `Employee deleted document "${documentName}" from engagement "${engagementTitle}"`
        : `Employee deleted document: ${documentName}`,
    });
  }, [logActivity]);

  const logUpdateProfile = useCallback((changes: string) => {
    return logActivity({
      action: 'UPDATE_PROFILE',
      details: `Employee updated profile: ${changes}`,
    });
  }, [logActivity]);

  const logViewEngagement = useCallback((engagementTitle: string) => {
    return logActivity({
      action: 'VIEW_ENGAGEMENT',
      details: `Employee viewed engagement: ${engagementTitle}`,
    });
  }, [logActivity]);

  const logStartEngagement = useCallback((engagementTitle: string, clientName: string) => {
    return logActivity({
      action: 'START_ENGAGEMENT',
      details: `Employee started engagement "${engagementTitle}" for client "${clientName}"`,
    });
  }, [logActivity]);

  const logKYCSetup = useCallback((engagementTitle: string, clientName: string) => {
    return logActivity({
      action: 'KYC_SETUP',
      details: `Employee initiated KYC setup for engagement "${engagementTitle}" with client "${clientName}"`,
    });
  }, [logActivity]);

  const logKYCComplete = useCallback((engagementTitle: string, clientName: string) => {
    return logActivity({
      action: 'KYC_COMPLETE',
      details: `Employee completed KYC setup for engagement "${engagementTitle}" with client "${clientName}"`,
    });
  }, [logActivity]);

  const logESignature = useCallback((engagementTitle: string, action: string) => {
    return logActivity({
      action: 'E_SIGNATURE',
      details: `Employee ${action} e-signature for engagement "${engagementTitle}"`,
    });
  }, [logActivity]);

  return {
    logActivity,
    logLogin,
    logLogout,
    logViewDashboard,
    logViewClient,
    logCreateEngagement,
    logUpdateEngagement,
    logCreateClient,
    logUpdateClient,
    logUploadDocument,
    logDeleteDocument,
    logUpdateProfile,
    logViewEngagement,
    logStartEngagement,
    logKYCSetup,
    logKYCComplete,
    logESignature,
  };
};
