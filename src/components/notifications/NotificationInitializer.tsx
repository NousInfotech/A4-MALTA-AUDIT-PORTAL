import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFCMToken } from '@/hooks/useNotifications';
import { registerFirebaseServiceWorker } from '@/lib/registerServiceWorker';
import { toast } from 'sonner';

/**
 * NotificationInitializer
 * Handles FCM token registration when user logs in
 */
export const NotificationInitializer = () => {
  const { user } = useAuth();
  const { requestPermission, permission } = useFCMToken();

  useEffect(() => {
    // Register service worker when app loads
    if (user) {
      registerFirebaseServiceWorker().catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, [user]);

  useEffect(() => {
    // Request notification permission when user logs in
    if (user && permission === 'default') {
      // Wait a bit after login before prompting
      const timer = setTimeout(() => {
        toast.info('Enable notifications to stay updated?', {
          description: 'Get real-time updates on your engagements and documents',
          action: {
            label: 'Enable',
            onClick: () => {
              requestPermission();
            }
          },
          duration: 10000
        });
      }, 2000); // Wait 2 seconds after login

      return () => clearTimeout(timer);
    }
  }, [user, permission, requestPermission]);

  // This component doesn't render anything
  return null;
};

