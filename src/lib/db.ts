import { api } from './api';

export interface DatabaseUserPreferences {
  DarkModeOn: number;
  FixedScrollOn: number;
  NotificationsOn: number;
  PrefsVersion: number;
}

export async function dbGetPreferences(userId: string): Promise<DatabaseUserPreferences> {
  try {
    // TODO: Replace with actual database query
    // This is a placeholder implementation
    const data = await api.getUserPreferences(userId);
    return {
      DarkModeOn: data.darkMode ? 1 : 0,
      FixedScrollOn: data.fixedScroll ? 1 : 0,
      NotificationsOn: data.notificationsOn ? 1 : 0,
      PrefsVersion: data.version || 1,
    };
  } catch (error) {
    console.error('Error fetching preferences from database:', error);
    // Return default preferences if database fails
    return {
      DarkModeOn: 0,
      FixedScrollOn: 0,
      NotificationsOn: 1,
      PrefsVersion: 1,
    };
  }
}

export async function dbUpdateUserPrefs(
  userId: string,
  darkMode?: boolean,
  fixedScroll?: boolean,
  notificationsOn?: boolean
): Promise<DatabaseUserPreferences> {
  try {
    // Until an upstream update endpoint is available, synthesize updated values
    const nextVersion = Date.now();
    return {
      DarkModeOn: darkMode ? 1 : 0,
      FixedScrollOn: fixedScroll ? 1 : 0,
      NotificationsOn: notificationsOn ? 1 : 0,
      PrefsVersion: nextVersion,
    };
  } catch (error) {
    console.error('Error updating preferences in database:', error);
    throw error;
  }
}