import { cookies } from 'next/headers';
import type { UserPreferences } from '@/types/preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
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
};

export async function getPrefsCookie(): Promise<UserPreferences | null> {
  try {
    const cookieStore = await cookies();
    const prefsCookie = cookieStore.get('user-preferences');
    
    if (!prefsCookie) {
      console.log('getPrefsCookie: No cookie found, returning null');
      return null;
    }
    
    const parsed = JSON.parse(prefsCookie.value);
    console.log('getPrefsCookie: Read cookie with darkMode:', parsed?.darkMode);
    
    // Merge with defaults to ensure all fields exist
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch (error) {
    console.error('Error reading preferences cookie:', error);
    return null;
  }
}

export async function setPrefsCookie(prefs: UserPreferences): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set('user-preferences', JSON.stringify(prefs), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/', // Ensure cookie is available throughout the app
    });
    console.log('setPrefsCookie: Cookie set successfully with darkMode:', prefs.darkMode);
  } catch (error) {
    console.error('Error setting preferences cookie:', error);
  }
}