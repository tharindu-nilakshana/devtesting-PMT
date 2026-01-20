"use client";

import { useState, useEffect, useRef } from 'react';
import { updatePrefs } from '../app/actions/updatePrefs';
import { setTheme as setHtmlTheme } from '@/utils/themeStyles';
import { UserPreferences } from '@/types/preferences';

type PreferencesChangeDetail = {
  source?: string;
  preferences: Partial<UserPreferences>;
};

export function usePreferences(userId?: string) {
  const instanceIdRef = useRef<string>();

  if (!instanceIdRef.current) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      instanceIdRef.current = crypto.randomUUID();
    } else {
      instanceIdRef.current = Math.random().toString(36).slice(2);
    }
  }

  const broadcastPreferences = (preferencesToBroadcast: UserPreferences) => {
    if (typeof window === 'undefined') return;

    const event = new CustomEvent<PreferencesChangeDetail>('pmt-preferences-changed', {
      detail: {
        source: instanceIdRef.current,
        preferences: preferencesToBroadcast,
      },
    });

    window.dispatchEvent(event);
  };

  const [preferences, setPreferences] = useState<UserPreferences>({
    darkMode: true,
    fixedScroll: false,
    notificationsOn: true,
    newWidgetLayout: false,
    newRecapsLayout: false,
    newResearchFilesLayout: false,
    numFormat: 'EU Format',
    dateFormat: 'DD/MM/YYYY',
    notificationSoundId: '0',
    version: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fcmCallback, setFcmCallback] = useState<(() => Promise<boolean>) | null>(null);

  // Load preferences from upstream API on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // First try to get preferences from upstream API for fresh data
        const response = await fetch('/api/user/get-preferences', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const result = await response.json();
          const data = result?.data || result;
          
          if (data && typeof data === 'object') {
            // Map upstream format to local format
            const toBool = (val: unknown): boolean => {
              if (typeof val === 'boolean') return val;
              if (typeof val === 'number') return val === 1;
              if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true';
              return false;
            };
            
            const toInt = (val: unknown): number | null => {
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                const n = parseInt(val, 10);
                return Number.isNaN(n) ? null : n;
              }
              if (typeof val === 'boolean') return val ? 1 : 0;
              return null;
            };
            
            const updates: Partial<UserPreferences> = {};
            
            // Map all preference fields from upstream
            const darkModeValue = data.LoggedInDarkModeOn ?? data.DarkModeOn ?? data.darkModeOn;
            if (typeof darkModeValue !== 'undefined') {
              updates.darkMode = toBool(darkModeValue);
            }
            
            const fixedScrollValue = data.LoggedInFixedScrollOn ?? data.FixedScrollOn ?? data.fixedScrollOn;
            if (typeof fixedScrollValue !== 'undefined') {
              updates.fixedScroll = toBool(fixedScrollValue);
            }
            
            const notificationsValue = data.LoggedInNotificationOn ?? data.NotificationOn ?? data.notificationsOn;
            if (typeof notificationsValue !== 'undefined') {
              updates.notificationsOn = toBool(notificationsValue);
            }
            
            if (typeof data.LoggedInNewWidgetLayout !== 'undefined') {
              updates.newWidgetLayout = toBool(data.LoggedInNewWidgetLayout);
            }
            
            if (typeof data.LoggedInRecapsStyle !== 'undefined') {
              updates.newRecapsLayout = toBool(data.LoggedInRecapsStyle);
            }
            
            if (typeof data.LoggedInRFilesStyle !== 'undefined') {
              updates.newResearchFilesLayout = toBool(data.LoggedInRFilesStyle);
            }
            
            const numFormatValue = data.LoggedInNumFormat ?? data.NumFormat ?? data.numFormat;
            if (typeof numFormatValue !== 'undefined') {
              const n = toInt(numFormatValue);
              updates.numFormat = n === 1 ? 'EU Format' : 'US Format';
            }
            
            const dateFormatValue = data.LoggedInDateFormat ?? data.DateFormat ?? data.dateFormat;
            if (dateFormatValue) {
              updates.dateFormat = dateFormatValue;
            }
            
            const soundValue = data.LoggedInNotificationSoundID ?? data.NotificationSoundID ?? data.notificationSoundId;
            if (typeof soundValue !== 'undefined') {
              const n = toInt(soundValue);
              if (n === -1) updates.notificationSoundId = 'Silent';
              else if (n === 1) updates.notificationSoundId = 'Chime';
              else if (n === 2) updates.notificationSoundId = 'Ping';
              else updates.notificationSoundId = '0';
            }
            
            if (Object.keys(updates).length > 0) {
              setPreferences(prev => {
                const next = { ...prev, ...updates };
                setTimeout(() => {
                  broadcastPreferences(next);
                }, 0);
                return next;
              });
            }
          }
        } else {
          // Fallback to cookie if upstream fails
          const cookieResponse = await fetch('/api/user/preferences');
          if (cookieResponse.ok) {
            const data = await cookieResponse.json();
            setPreferences(prev => {
              const next = { ...prev, ...data };
              setTimeout(() => {
                broadcastPreferences(next);
              }, 0);
              return next;
            });
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
        // Try cookie as final fallback
        try {
          const cookieResponse = await fetch('/api/user/preferences');
          if (cookieResponse.ok) {
            const data = await cookieResponse.json();
            setPreferences(prev => ({ ...prev, ...data }));
          }
        } catch (fallbackError) {
          console.error('Cookie fallback also failed:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Track if initial load has completed
  const hasInitialLoadCompleted = useRef(false);

  // Keep html[data-theme] in sync with preferences, but ONLY after initial load
  useEffect(() => {
    // Skip theme sync on initial mount - the server already set the correct theme from cookie
    // We only want to sync when preferences actually change after load
    if (!hasInitialLoadCompleted.current) {
      if (!isLoading) {
        hasInitialLoadCompleted.current = true;
      }
      return;
    }
    setHtmlTheme(preferences.darkMode ? 'dark' : 'light');
  }, [preferences.darkMode, isLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = ((event: Event) => {
      const customEvent = event as CustomEvent<PreferencesChangeDetail>;
      const detail = customEvent.detail;
      if (!detail) return;
      if (detail.source === instanceIdRef.current) return;

      setPreferences(prev => ({ ...prev, ...detail.preferences }));
    }) as EventListener;

    window.addEventListener('pmt-preferences-changed', handler);

    return () => {
      window.removeEventListener('pmt-preferences-changed', handler);
    };
  }, []);

  const updatePreference = async <K extends keyof Omit<UserPreferences, 'version'>>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!userId) {
      console.warn('❌ Cannot update preferences without userId - userId is:', userId);
      return;
    }
  
    console.log(`✅ usePreferences.updatePreference: Updating ${key} = ${value} for userId: ${userId}`);
  
    try {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);
      broadcastPreferences(newPreferences);

      // Immediately sync theme to HTML if darkMode changed
      if (key === 'darkMode') {
        setHtmlTheme(value ? 'dark' : 'light');
      }
  
      // Update on server - pass key and value
      console.log(`📡 Calling updatePrefs API with userId: ${userId}, key: ${key}, value: ${value}`);
      await updatePrefs(userId, key, value);
      console.log(`✅ updatePrefs API call completed successfully`);
  
      // Handle FCM token when notifications are toggled
      if (key === 'notificationsOn' && fcmCallback) {
        if (value) {
          await fcmCallback();
        }
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
      setPreferences(preferences);
      // Rollback theme if it was a darkMode change
      if (key === 'darkMode') {
        setHtmlTheme(preferences.darkMode ? 'dark' : 'light');
      }
    }
  };

  // Function to update preferences without making API calls (for loading from server)
  const loadPreference = (key: keyof Omit<UserPreferences, 'version'>, value: boolean) => {
    console.log(`usePreferences: Loading ${key} = ${value}`);
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    // Defer broadcast to avoid state updates during render
    setTimeout(() => {
      broadcastPreferences(newPreferences);
    }, 0);
  };

  const batchLoadPreferences = (updates: Partial<UserPreferences>) => {
    console.log('usePreferences: batchLoadPreferences called with:', updates);
    console.log('usePreferences: current preferences before update:', preferences);
    setPreferences(prev => {
      const newPrefs = { ...prev, ...updates };
      console.log('usePreferences: new preferences after update:', newPrefs);
      
      // Immediately sync theme if darkMode was updated
      if ('darkMode' in updates) {
        setTimeout(() => {
          setHtmlTheme(newPrefs.darkMode ? 'dark' : 'light');
        }, 0);
      }
      
      // Defer broadcast to avoid state updates during render
      setTimeout(() => {
        broadcastPreferences(newPrefs);
      }, 0);
      return newPrefs;
    });
  };

  return {
    preferences,
    isLoading,
    updatePreference,
    loadPreference,
    batchLoadPreferences,
    setFcmCallback,
    // Convenience methods
    toggleDarkMode: () => updatePreference('darkMode', !preferences.darkMode),
    toggleFixedScroll: () => updatePreference('fixedScroll', !preferences.fixedScroll),
    toggleNotifications: () => updatePreference('notificationsOn', !preferences.notificationsOn),
    toggleNewWidgetLayout: () => updatePreference('newWidgetLayout', !preferences.newWidgetLayout),
    toggleNewRecapsLayout: () => updatePreference('newRecapsLayout', !preferences.newRecapsLayout),
    toggleNewResearchFilesLayout: () => updatePreference('newResearchFilesLayout', !preferences.newResearchFilesLayout),
    toggleNumFormat: () => updatePreference('numFormat', preferences.numFormat === 'EU Format' ? 'US Format' : 'EU Format'),
    toggleDateFormat: () => updatePreference('dateFormat', preferences.dateFormat === 'DD/MM/YYYY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'),
    toggleNotificationSoundId: () => updatePreference('notificationSoundId', preferences.notificationSoundId === '0' ? '1' : '0'),
  };
}
