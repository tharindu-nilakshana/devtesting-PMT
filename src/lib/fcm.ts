/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { initializeApp, type FirebaseApp } from "firebase/app";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB3fd9iDbVPgTxadUNKnX-xAub46x7mmAY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "prime-market-terminal.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "prime-market-terminal",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "prime-market-terminal.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1010154718430",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1010154718430:web:e8c60042abffbe25ffee4f",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-8HBMC3RGLT"
};

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "BJ9RxMinpCijGLN0H-F7bjrHsjU574WBsJyy1tKNCnxMtFL8KcU1mET3BrFen-T9e_d35PEADcnYgNUdjX_h2sc";

// Defer Firebase initialization until we're safely on the client
let appInstance: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

function ensureMessaging(): Messaging {
  if (typeof window === 'undefined') {
    throw new Error('FCM can only be used in the browser');
  }
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
  }
  if (!messagingInstance) {
    messagingInstance = getMessaging(appInstance);
  }
  return messagingInstance as Messaging;
}

// Device ID generation (simple UUID-like string)
function generateDeviceId(): string {
  return 'web_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Get or create device ID
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'web_ssr_disabled';
  let deviceId = localStorage.getItem('fcm_device_id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('fcm_device_id', deviceId);
  }
  return deviceId;
}

// Save FCM token to server
export async function saveFCMToken(token: string): Promise<boolean> {
  try {
    const deviceId = getDeviceId();

    console.log('🔔 FCM Token Debug Info:');
    console.log('Device ID:', deviceId);
    console.log('FCM Token:', token);
    console.log('API URL: /api/fcm/save-token');
    console.log('Request Body:', JSON.stringify({
      deviceId: deviceId,
      token: token
    }, null, 2));

    const response = await fetch('/api/fcm/save-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({
        deviceId: deviceId,
        token: token
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ FCM token save failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ FCM token saved successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to save FCM token:', error);
    return false;
  }
}

// Delete FCM token from server
export async function deleteFCMToken(): Promise<boolean> {
  try {
    const deviceId = getDeviceId();

    console.log('🗑️ Deleting FCM token:');
    console.log('Device ID:', deviceId);
    console.log('API URL: /api/fcm/delete-token');

    const response = await fetch('/api/fcm/delete-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({
        deviceId: deviceId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ FCM token deletion failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ FCM token deleted successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete FCM token:', error);
    return false;
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Get FCM token
export async function getFCMToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    if (!('serviceWorker' in navigator)) {
      console.log('❌ Service Worker not supported');
      return null;
    }

    console.log('🔄 Registering service worker...');
    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('✅ Service worker registered:', registration);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    // console.log('✅ Service worker is ready');

    // console.log('🔄 Getting FCM token...');
    // Get FCM token with proper configuration
    const token = await getToken(ensureMessaging(), {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey
    });

    if (token) {
      // console.log('✅ FCM Token obtained:', token);
      // console.log('📱 Token length:', token.length);
      // console.log('🔍 Token preview:', token.substring(0, 50) + '...');
    } else {
      console.log('❌ No FCM token received');
    }

    return token;
  } catch (error) {
    console.error('❌ Failed to get FCM token:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

// Initialize FCM
export async function initializeFCM(): Promise<boolean> {
  try {
    // Check if notifications are enabled in preferences
    const preferencesResponse = await fetch('/api/user/preferences');
    const preferences = preferencesResponse.ok ? await preferencesResponse.json() : null;
    
    if (!preferences?.notificationsOn) {
      console.log('Notifications are disabled in preferences');
      return false;
    }

    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return false;
    }

    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      console.log('Failed to get FCM token');
      return false;
    }

    // Save token to server
    const saved = await saveFCMToken(token);
    if (saved) {
      console.log('FCM initialized successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to initialize FCM:', error);
    return false;
  }
}

// Listen for foreground messages
export function setupFCMListener(onNotification: (payload: any) => void) {
  try {
    if (typeof window === 'undefined') return;
    onMessage(ensureMessaging(), (payload) => {
      console.log('Foreground message received:', payload);
      onNotification(payload);
    });
  } catch (error) {
    console.error('Failed to setup FCM listener:', error);
  }
}

// Disable FCM completely (unregister service worker and delete token)
export async function disableFCM(): Promise<boolean> {
  try {
    console.log('🔄 Disabling FCM...');

    // Delete token from server
    const tokenDeleted = await deleteFCMToken();
    if (tokenDeleted) {
      console.log('✅ FCM token deleted from server');
    }

    // Unregister service worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.scope.includes('firebase-messaging')) {
          await registration.unregister();
          console.log('✅ Firebase messaging service worker unregistered');
        }
      }
    }

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fcm_device_id');
    }
    // console.log('✅ FCM local storage cleared');

    // console.log('✅ FCM disabled successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to disable FCM:', error);
    return false;
  }
}

// Check if FCM is supported
export function isFCMSupported(): boolean {
  return typeof window !== 'undefined' && 
         'serviceWorker' in navigator && 
         'Notification' in window && 
         'PushManager' in window;
}
