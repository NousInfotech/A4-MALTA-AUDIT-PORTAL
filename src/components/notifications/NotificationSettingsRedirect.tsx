import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Redirects to the correct notification settings page based on user role
 */
export const NotificationSettingsRedirect = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) {
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    // Redirect based on user role
    const rolePathMap: Record<string, string> = {
      admin: '/admin/settings/notifications',
      employee: '/employee/settings/notifications',
      client: '/client/settings/notifications'
    };

    const path = rolePathMap[user.role] || '/';
    navigate(path, { replace: true });
  }, [user, isLoading, navigate]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to notification settings...</p>
      </div>
    </div>
  );
};

