"use client";

import { useEffect, useState, useCallback } from 'react';
import { initializeFCM, setupFCMListener, isFCMSupported, saveFCMToken, getFCMToken, disableFCM } from '../lib/fcm';

export function useFCM() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check if FCM is supported
  useEffect(() => {
    setIsSupported(isFCMSupported());
  }, []);

  // Initialize FCM when notifications are enabled
  const initialize = useCallback(async () => {
    if (!isSupported) {
      setError('FCM not supported in this browser');
      return false;
    }

    try {
      setError(null);
      const success = await initializeFCM();
      setIsInitialized(success);
      
      if (success) {
        const fcmToken = await getFCMToken();
        setToken(fcmToken);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsInitialized(false);
      return false;
    }
  }, [isSupported]);

  // Re-register token when notifications are re-enabled
  const reinitialize = useCallback(async () => {
    if (token) {
      const success = await saveFCMToken(token);
      setIsInitialized(success);
      return success;
    }
    return await initialize();
  }, [token, initialize]);

  // Setup notification listener
  const setupNotificationListener = useCallback((onNotification: (payload: any) => void) => {
    if (isInitialized) {
      setupFCMListener(onNotification);
    }
  }, [isInitialized]);

  // Disable FCM completely
  const disable = useCallback(async () => {
    if (!isSupported) {
      setError('FCM not supported in this browser');
      return false;
    }

    try {
      setError(null);
      const success = await disableFCM();
      setIsInitialized(false);
      setToken(null);
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    isInitialized,
    error,
    token,
    initialize,
    reinitialize,
    disable,
    setupNotificationListener
  };
}

