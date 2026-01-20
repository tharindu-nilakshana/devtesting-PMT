// Client-safe System Variables Utilities
// These functions can be safely imported in client components

/**
 * Synchronous helper to get user timezone from cookie for React useState initialization.
 * Falls back to browser timezone if cookie is not available or parsing fails.
 * Should only be called on the client side.
 */
export function getUserTimezoneSync(): string {
  if (typeof window === 'undefined') {
    return 'UTC';
  }
  
  try {
    const userDataCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('pmt_user_data='));
    if (userDataCookie) {
      const userData = JSON.parse(decodeURIComponent(userDataCookie.split('=')[1]));
      if (userData.timezone) {
        return userData.timezone;
      }
    }
  } catch (e) {
    console.warn('Failed to parse user timezone from cookie:', e);
  }
  
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
