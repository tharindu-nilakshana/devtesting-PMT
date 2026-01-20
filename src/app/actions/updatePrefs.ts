"use server";

import { getPrefsCookie, setPrefsCookie } from "../../lib/cookie";
import { UserPreferences } from "@/types/preferences";
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function updatePrefs(
  userId: string,
  key: keyof Omit<UserPreferences, 'version'>,
  value: UserPreferences[keyof Omit<UserPreferences, 'version'>]
) {
  try {
    console.log(`updatePrefs: Updating ${key} to ${value} for user ${userId}`);
    
    // Get current preferences from cookie to preserve all fields
    const currentPrefs = await getPrefsCookie();
    
    // Prepare payload for API - ONLY send userId and the specific field being changed
    const payload: Record<string, unknown> = { userId };
    
    // Map the key to the API format - ONLY the field being changed
    switch (key) {
      case 'darkMode':
        payload.darkModeOn = value ? 1 : 0;
        break;
      case 'fixedScroll':
        payload.fixedScrollOn = value ? 1 : 0;
        break;
      case 'notificationsOn':
        payload.notificationOn = value;
        break;
      case 'newWidgetLayout':
        payload.newWidgetLayout = value ? 1 : 0;
        break;
      case 'newRecapsLayout':
        payload.recapsStyle = value ? 1 : 0;
        break;
      case 'newResearchFilesLayout':
        payload.rFilesStyle = value ? 1 : 0;
        break;
      case 'numFormat':
        payload.numFormat = value === 'EU Format' ? 1 : 0;
        break;
      case 'dateFormat':
        payload.dateFormat = value;
        break;
      case 'notificationSoundId':
        const soundId = value === 'Silent' ? -1 : value === 'Chime' ? 1 : value === 'Ping' ? 2 : 0;
        payload.notificationSoundId = soundId;
        break;
    }

    console.log(`updatePrefs: Sending to API - only field being changed:`, payload);

    // DO NOT include other preferences - only send what changed

    try {
      // Get auth token from cookies
      const cookieStore = await cookies();
      const token = cookieStore.get('pmt_auth_token')?.value;

      if (!token) {
        throw new Error('Missing auth token');
      }

      // Call upstream API directly
      const upstream = await fetch(`${API_CONFIG.UPSTREAM_API}updateUserPreferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const data = await upstream.json();

      if (!upstream.ok) {
        throw new Error(data?.error || 'Failed to update preferences');
      }

      // Helper function to safely get boolean value
      const getBoolValue = (bodyVal: unknown, apiVal: unknown, currentVal: boolean | undefined, defaultVal: boolean = false): boolean => {
        // If this field was in the request payload, use its value
        if (typeof bodyVal === 'number') return bodyVal === 1;
        if (typeof bodyVal === 'boolean') return bodyVal;
        // Otherwise preserve the current cookie value (field wasn't being updated)
        if (currentVal !== undefined) return currentVal;
        // Fallback to API response (for initial load)
        if (typeof apiVal === 'number') return apiVal === 1;
        if (typeof apiVal === 'boolean') return apiVal;
        return defaultVal;
      };

      // Build updated preferences - preserve current values for fields not being changed
      const updatedPrefs: UserPreferences = {
        darkMode: getBoolValue(
          payload.darkModeOn,
          data.LoggedInDarkModeOn ?? data.DarkModeOn,
          currentPrefs?.darkMode,
          false
        ),
        fixedScroll: getBoolValue(
          payload.fixedScrollOn,
          data.LoggedInFixedScrollOn ?? data.FixedScrollOn,
          currentPrefs?.fixedScroll,
          false
        ),
        notificationsOn: getBoolValue(
          payload.notificationOn,
          data.LoggedInNotificationOn ?? data.NotificationsOn,
          currentPrefs?.notificationsOn,
          true
        ),
        newWidgetLayout: getBoolValue(
          payload.newWidgetLayout,
          data.LoggedInNewWidgetLayout,
          currentPrefs?.newWidgetLayout,
          false
        ),
        newRecapsLayout: getBoolValue(
          payload.recapsStyle,
          data.LoggedInRecapsStyle,
          currentPrefs?.newRecapsLayout,
          false
        ),
        newResearchFilesLayout: getBoolValue(
          payload.rFilesStyle,
          data.LoggedInRFilesStyle,
          currentPrefs?.newResearchFilesLayout,
          false
        ),
        numFormat: (() => {
          // If numFormat was in the request, use that value
          if (payload.numFormat === 1) return 'EU Format';
          if (payload.numFormat === 0) return 'US Format';
          // Otherwise preserve current value
          if (currentPrefs?.numFormat) return currentPrefs.numFormat;
          // Fallback to API response
          if (data.LoggedInNumFormat === 1) return 'EU Format';
          return 'EU Format';
        })(),
        dateFormat: (() => {
          // If dateFormat was in the request, use that value
          if (payload.dateFormat) return payload.dateFormat as string;
          // Otherwise preserve current value
          if (currentPrefs?.dateFormat) return currentPrefs.dateFormat;
          // Fallback to API response
          return data.LoggedInDateFormat || 'DD/MM/YYYY';
        })(),
        notificationSoundId: (() => {
          // If notificationSoundId was in the request, use that value
          if (payload.notificationSoundId !== undefined) {
            const sId = payload.notificationSoundId;
            if (sId === -1) return 'Silent';
            if (sId === 1) return 'Chime';
            if (sId === 2) return 'Ping';
            return '0';
          }
          // Otherwise preserve current value
          if (currentPrefs?.notificationSoundId) return currentPrefs.notificationSoundId;
          // Fallback to API response
          const apiSId = data.LoggedInNotificationSoundID;
          if (apiSId === -1) return 'Silent';
          if (apiSId === 1) return 'Chime';
          if (apiSId === 2) return 'Ping';
          return '0';
        })(),
        version: data.PrefsVersion || Date.now(),
      };

      console.log('updatePrefs: Setting cookie with:', updatedPrefs);

      // Set the preferences cookie
      await setPrefsCookie(updatedPrefs);
      
      return { success: true, data: updatedPrefs };
    } catch (apiError) {
      console.error('API call failed:', apiError);
      // If API fails, just update the local cookie
      const updatedPrefs: UserPreferences = {
        ...currentPrefs,
        [key]: value,
        version: Date.now(),
      } as UserPreferences;
      
      await setPrefsCookie(updatedPrefs);
      return { success: false, error: apiError, data: updatedPrefs };
    }
  } catch (error) {
    console.error('Error updating preferences:', error);
    throw error;
  }
}

export async function clearPrefs() {
  try {
    const defaultPrefs: UserPreferences = {
      darkMode: true,
      fixedScroll: false,
      notificationsOn: true,
      newWidgetLayout: false,
      newRecapsLayout: false,
      newResearchFilesLayout: false,
      numFormat: 'EU Format',
      dateFormat: 'DD/MM/YYYY',
      notificationSoundId: '0',
      version: 0,
    };
    
    await setPrefsCookie(defaultPrefs);
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing preferences:', error);
    throw error;
  }
}