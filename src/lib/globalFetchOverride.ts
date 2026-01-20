/**
 * Global Fetch Override
 * 
 * Overrides the global fetch function to automatically cache
 * API responses for widget data. This prevents redundant API calls
 * when switching between tabs/templates.
 * 
 * How it works:
 * 1. Intercepts all fetch calls to /api/* routes
 * 2. For widget data endpoints (GET or POST), checks cache first
 * 3. Returns cached data instantly if available
 * 4. Only makes real API call on first request (cache miss)
 * 5. WebSocket updates refresh the cache in real-time
 * 
 * Import this file once in your app layout to enable caching globally.
 */

import { cachedFetch } from './cachedFetch';

// Only run on client side
if (typeof window !== 'undefined') {
  // Store original fetch
  const originalFetch = window.fetch.bind(window);

  // Override window.fetch
  window.fetch = async function patchedFetch(
    input: RequestInfo | URL, 
    init?: RequestInit
  ): Promise<Response> {
    let url: string;
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    } else {
      return originalFetch(input, init);
    }

    // Only intercept API routes
    const isApiRoute = url.includes('/api/');

    if (isApiRoute) {
      // Use cached fetch for API requests
      return cachedFetch.fetch(url, init);
    }

    // Use original fetch for everything else
    return originalFetch(input, init);
  };

  console.log('🚀 [CachedFetch] Global fetch override enabled - Widget API responses will be cached');
}

export {};
