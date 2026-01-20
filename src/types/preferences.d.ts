// Type definitions for preferences system

export interface UserPreferences {
  darkMode: boolean;
  fixedScroll: boolean;
  notificationsOn: boolean;
  newWidgetLayout: boolean;
  newRecapsLayout: boolean;
  newResearchFilesLayout: boolean;
  numFormat: string;
  dateFormat: string;
  notificationSoundId: string;  
  version: number;
}

export interface DatabasePreferences {
  userId: string
  darkModeOn: boolean
  fixedScrollOn: boolean
  notificationsOn: boolean
  prefsVersion: number
  createdAt: Date
  updatedAt: Date
}

export interface CachedPreferences {
  darkMode: boolean
  fixedScroll: boolean
  notificationsOn: boolean
  version: number
  cachedAt: number
  ttl: number
}

export interface PreferencesUpdateRequest {
  darkMode?: boolean
  fixedScroll?: boolean
  notificationsOn?: boolean
}

export interface PreferencesResponse {
  success: boolean
  preferences?: UserPreferences
  error?: string
}

// Theme-related types
export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemePreferences {
  mode: ThemeMode
  customColors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
}

// Scroll behavior types
export type ScrollBehavior = 'smooth' | 'instant' | 'auto'

export interface ScrollPreferences {
  behavior: ScrollBehavior
  fixedHeader: boolean
  fixedSidebar: boolean
}

// Combined preferences interface
export interface AppPreferences extends UserPreferences {
  theme?: ThemePreferences
  scroll?: ScrollPreferences
}

// Server action types
export interface UpdatePrefsActionData {
  darkMode: boolean
  fixedScroll: boolean
  notificationsOn: boolean
}

// Cookie types
export interface PreferencesCookieData {
  darkMode: boolean
  fixedScroll: boolean
  notificationsOn: boolean
  version: number
  userId: string
  expires: number
}

// API response types
export interface PreferencesApiResponse {
  data: UserPreferences
  meta: {
    version: number
    lastUpdated: string
    source: 'database' | 'cache' | 'default'
  }
}
