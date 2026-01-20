/**
 * Language Integration with System Variables
 * Handles language preference synchronization between i18n and system variables
 */

import { updateSystemVariablesAction } from '../app/actions/systemVariables';
import type { SystemVariables } from '../types/systemVariables';

/**
 * Update language preference in system variables
 */
export async function updateLanguagePreference(languageCode: string): Promise<void> {
  try {
    // Create form data for the server action
    const formData = new FormData();
    formData.append('appearance', JSON.stringify({
      LanguagePreference: languageCode
    }));

    // Update system variables
    await updateSystemVariablesAction(formData);
    
    console.log(`Language preference updated to: ${languageCode}`);
  } catch (error) {
    console.error('Error updating language preference:', error);
    throw error;
  }
}

/**
 * Get current language preference from system variables
 */
export function getLanguagePreference(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('lang') || 'en';
  }
  return 'en';
}

/**
 * Set language preference in both i18n and system variables
 */
export async function setLanguagePreference(languageCode: string): Promise<void> {
  try {
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', languageCode);
    }

    // Update document language attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = languageCode;
    }

    // Update system variables (if user is logged in)
    await updateLanguagePreference(languageCode);
    
    console.log(`Language preference set to: ${languageCode}`);
  } catch (error) {
    console.error('Error setting language preference:', error);
    throw error;
  }
}

/**
 * Initialize language from system variables on login
 */
export function initializeLanguageFromSystemVariables(systemVariables: SystemVariables): string {
  const languageCode =
    (systemVariables.appearance &&
      (systemVariables.appearance as { [key: string]: unknown }).LanguagePreference) ||
    'en';

  // Set in localStorage
  if (typeof window !== 'undefined' && typeof languageCode === 'string') {
    localStorage.setItem('lang', languageCode);
  }

  // Update document language attribute
  if (typeof document !== 'undefined' && typeof languageCode === 'string') {
    document.documentElement.lang = languageCode;
  }

  return typeof languageCode === 'string' ? languageCode : 'en';
}

/**
 * Supported language codes
 */
export const SUPPORTED_LANGUAGES = ['en', 'de', 'es', 'fr', 'it', 'ru'] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Validate language code
 */
export function isValidLanguageCode(code: string): code is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage);
}
