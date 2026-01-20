import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';
import { getPrefsCookie, setPrefsCookie } from '@/lib/cookie';
import { UserPreferences } from '@/types/preferences';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing auth token' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();

    console.log('update-preferences: Received body:', body);

    // Call upstream API (pass through all fields including languagePreference)
    const upstream = await fetch(`${API_CONFIG.UPSTREAM_API}updateUserPreferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: data?.error || 'Failed to update preferences' },
        { status: upstream.status }
      );
    }

    console.log('update-preferences: Upstream response:', data);

    // Get current preferences from cookie
    const currentPrefs = await getPrefsCookie();

    // Helper function to safely get boolean value
    const getBoolValue = (bodyVal: unknown, apiVal: unknown, currentVal: boolean | undefined, defaultVal: boolean = false): boolean => {
      // Priority: body value (what we just sent) -> current cookie value -> API response -> default
      if (typeof bodyVal === 'number') return bodyVal === 1;
      if (typeof bodyVal === 'boolean') return bodyVal;
      if (currentVal !== undefined) return currentVal;
      if (typeof apiVal === 'number') return apiVal === 1;
      if (typeof apiVal === 'boolean') return apiVal;
      return defaultVal;
    };

    // Build updated preferences with strict priority order
    const updatedPrefs: UserPreferences = {
      darkMode: getBoolValue(
        body.darkModeOn,
        data.LoggedInDarkModeOn ?? data.DarkModeOn,
        currentPrefs?.darkMode,
        false
      ),
      fixedScroll: getBoolValue(
        body.fixedScrollOn,
        data.LoggedInFixedScrollOn ?? data.FixedScrollOn,
        currentPrefs?.fixedScroll,
        false
      ),
      notificationsOn: getBoolValue(
        body.notificationOn,
        data.LoggedInNotificationOn ?? data.NotificationsOn,
        currentPrefs?.notificationsOn,
        true
      ),
      newWidgetLayout: getBoolValue(
        body.newWidgetLayout,
        data.LoggedInNewWidgetLayout,
        currentPrefs?.newWidgetLayout,
        false
      ),
      newRecapsLayout: getBoolValue(
        body.recapsStyle,
        data.LoggedInRecapsStyle,
        currentPrefs?.newRecapsLayout,
        false
      ),
      newResearchFilesLayout: getBoolValue(
        body.rFilesStyle,
        data.LoggedInRFilesStyle,
        currentPrefs?.newResearchFilesLayout,
        false
      ),
      numFormat: (() => {
        if (body.numFormat === 1) return 'EU Format';
        if (body.numFormat === 0) return 'US Format';
        if (currentPrefs?.numFormat) return currentPrefs.numFormat;
        if (data.LoggedInNumFormat === 1) return 'EU Format';
        return 'EU Format';
      })(),
      dateFormat: body.dateFormat || currentPrefs?.dateFormat || data.LoggedInDateFormat || 'DD/MM/YYYY',
      notificationSoundId: (() => {
        const soundId = body.notificationSoundId ?? (currentPrefs?.notificationSoundId ? 
          (currentPrefs.notificationSoundId === 'Silent' ? -1 : 
           currentPrefs.notificationSoundId === 'Chime' ? 1 : 
           currentPrefs.notificationSoundId === 'Ping' ? 2 : 0) 
          : data.LoggedInNotificationSoundID);
        
        if (soundId === -1) return 'Silent';
        if (soundId === 1) return 'Chime';
        if (soundId === 2) return 'Ping';
        return '0';
      })(),
      version: data.PrefsVersion || Date.now(),
    };

    console.log('update-preferences: Setting cookie with:', updatedPrefs);

    // Set the preferences cookie
    await setPrefsCookie(updatedPrefs);

    // If user profile data (name, email, timezone, timezoneId) was updated, update the user data cookie as well
    const userDataCookie = cookieStore.get('pmt_user_data')?.value;
    if (userDataCookie && (body.name || body.email || body.timezone || body.timezoneId)) {
      try {
        const userData = JSON.parse(userDataCookie);
        const updatedUserData = {
          ...userData,
          ...(body.name && { name: body.name }),
          ...(body.email && { email: body.email }),
          ...(body.timezone && { timezone: body.timezone }),
          ...(body.timezoneId && { timezoneId: body.timezoneId }),
        };
        
        console.log('update-preferences: Updating user data cookie:', updatedUserData);
        
        // Create response with updated user data cookie
        const response = NextResponse.json({
          success: true,
          message: 'User preferences updated successfully',
          data: data,
          preferences: updatedPrefs,
          user: updatedUserData, // Return updated user data
        });
        
        // Update the user data cookie
        response.cookies.set('pmt_user_data', JSON.stringify(updatedUserData), {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/'
        });
        
        return response;
      } catch (parseError) {
        console.error('Error parsing user data cookie:', parseError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User preferences updated successfully',
      data: data,
      preferences: updatedPrefs, // Return the actual preferences we saved
    });
  } catch (error) {
    console.error('Error in update-preferences proxy:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}