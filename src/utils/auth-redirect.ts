/**
 * Utility for handling authentication errors and redirecting to login
 */

/**
 * Handle 401 Unauthorized responses by clearing auth data and redirecting to login
 * @param response - The fetch Response object
 * @returns true if 401 was handled, false otherwise
 */
export function handle401Response(response: Response): boolean {
  if (response.status === 401) {
    console.warn('401 Unauthorized - redirecting to login');
    redirectToLogin();
    return true;
  }
  return false;
}

/**
 * Clear authentication data and redirect to login page
 */
export function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    // Clear auth data
    localStorage.removeItem('pmt_auth_token');
    localStorage.removeItem('pmt_user_data');
    
    // Redirect to login
    window.location.href = '/login';
  }
}

/**
 * Enhanced fetch wrapper that automatically handles 401 responses
 * @param input - URL or Request object
 * @param init - Request init options
 * @returns Promise<Response>
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);
  
  // Handle 401 and redirect
  if (response.status === 401) {
    console.warn('401 Unauthorized - redirecting to login');
    redirectToLogin();
  }
  
  return response;
}
