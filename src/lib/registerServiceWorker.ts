/**
 * Register Firebase Messaging Service Worker with dynamic config
 */
export const registerFirebaseServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Build query params with Firebase config
      const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };

      // Register service worker with config as URL params
      const params = new URLSearchParams(config as any);
      const registration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${params.toString()}`,
        { scope: '/' }
      );

      // Send config to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config
        });
      }

      console.log('✅ Service Worker registered successfully');
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

