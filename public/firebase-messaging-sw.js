importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js');

// Server root detection
let ServerRoot = "https://app.primemarket-terminal.com/";

if (self.location.host === "localhost") {
  ServerRoot = "http://localhost/Active/seasonaladvisor/httpdocs/";
} else if (self.location.host.includes("dev-test")) {
  ServerRoot = "https://dev-test.primemarket-terminal.com/";
} else if (self.location.host.includes("dev64")) {
  ServerRoot = "https://dev64.primemarket-terminal.com/";
} else if (self.location.host.includes("dev128")) {
  ServerRoot = "https://dev128.primemarket-terminal.com/";
} else if (self.location.host.includes("dev192")) {
  ServerRoot = "https://dev192.primemarket-terminal.com/";
} else if (self.location.host.includes("dev256")) {
  ServerRoot = "https://dev256.primemarket-terminal.com/";
}

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyB3fd9iDbVPgTxadUNKnX-xAub46x7mmAY",
  authDomain: "prime-market-terminal.firebaseapp.com",
  projectId: "prime-market-terminal",
  storageBucket: "prime-market-terminal.firebasestorage.app",
  messagingSenderId: "1010154718430",
  appId: "1:1010154718430:web:e8c60042abffbe25ffee4f",
  measurementId: "G-8HBMC3RGLT"
});

const messaging = firebase.messaging();

// Note: In Firebase v12, VAPID key is set when getting the token in the client-side code,
// not in the service worker. The service worker just handles background messages.

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  let notificationTitle, notificationOptions;
  
  if (payload.notification) {
    notificationTitle = payload.notification.title;
    notificationOptions = {
      body: payload.notification.body,
      icon: `${ServerRoot}/assets/img/round-logo.png`,
      data: payload.data || {},
      click_action: (payload.data && payload.data.url) || `${ServerRoot}`
    };
  } else if (payload.data) {
    notificationTitle = payload.data.title || 'New Notification';
    notificationOptions = {
      body: payload.data.body || '',
      icon: `${ServerRoot}/assets/img/round-logo.png`,
      data: payload.data,
      click_action: payload.data.url || payload.data.click_action || `${ServerRoot}`
    };
  } else {
    notificationTitle = 'New Notification';
    notificationOptions = {
      body: 'You have a new notification',
      icon: `${ServerRoot}/assets/img/round-logo.png`,
      data: {},
      click_action: `${ServerRoot}`
    };
  }
  
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({
      type: "window"
    })
    .then((clientList) => {
      const notificationData = event.notification.data || {};
      const url = notificationData.url ||
                  notificationData.click_action ||
                  event.notification.click_action ||
                  `${ServerRoot}`;
      
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle service worker messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

