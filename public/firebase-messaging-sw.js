// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration will be dynamically injected
// This is a placeholder that will be replaced when the service worker is registered
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    // Initialize Firebase with config from main app
    if (!firebase.apps.length) {
      firebase.initializeApp(event.data.config);
      console.log('[firebase-messaging-sw.js] Firebase initialized with dynamic config');
    }
  }
});

// Fallback: Try to get config from URL params during registration
const getFirebaseConfig = () => {
  try {
    const urlParams = new URLSearchParams(self.location.search);
    return {
      apiKey: urlParams.get('apiKey') || '',
      authDomain: urlParams.get('authDomain') || '',
      projectId: urlParams.get('projectId') || '',
      storageBucket: urlParams.get('storageBucket') || '',
      messagingSenderId: urlParams.get('messagingSenderId') || '',
      appId: urlParams.get('appId') || ''
    };
  } catch (error) {
    return null;
  }
};

// Initialize with URL params if available
const config = getFirebaseConfig();
if (config && config.projectId && !firebase.apps.length) {
  firebase.initializeApp(config);
  console.log('[firebase-messaging-sw.js] Firebase initialized from URL params');
}

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Audit Portal Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data,
    tag: payload.data?.notificationId || 'default',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'View'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app or navigate to specific page
  const actionUrl = event.notification.data?.actionUrl || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: event.notification.data
          });
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});

console.log('[firebase-messaging-sw.js] Service Worker initialized');

