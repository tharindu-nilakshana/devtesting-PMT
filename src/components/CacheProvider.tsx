"use client";

import { useEffect, useRef } from 'react';
import { handle401Response } from '../utils/auth-redirect';

/**
 * Simple in-memory cache for widget API responses
 */
const apiCache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Track in-flight requests to prevent duplicate concurrent requests
 */
const inFlightRequests = new Map<string, Promise<Response>>();

/**
 * LocalStorage key for get-symbols data
 */
const SYMBOLS_STORAGE_KEY = 'pmt_symbols_cache';

/**
 * Check if a URL is a get-symbols endpoint
 */
function isGetSymbolsEndpoint(url: string): boolean {
  return url.includes('/api/pmt/get-symbols');
}

/**
 * Get symbols data from localStorage
 */
function getSymbolsFromStorage(cacheKey: string): unknown | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(SYMBOLS_STORAGE_KEY);
    if (stored) {
      const cache = JSON.parse(stored);
      return cache[cacheKey] || null;
    }
  } catch (error) {
    console.error('Error reading symbols from localStorage:', error);
  }
  return null;
}

/**
 * Save symbols data to localStorage
 */
function saveSymbolsToStorage(cacheKey: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(SYMBOLS_STORAGE_KEY);
    const cache = stored ? JSON.parse(stored) : {};
    cache[cacheKey] = data;
    localStorage.setItem(SYMBOLS_STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving symbols to localStorage:', error);
  }
}

/**
 * Clear symbols data from localStorage
 */
function clearSymbolsFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SYMBOLS_STORAGE_KEY);
    console.log('🗑️ [Storage] Cleared symbols cache');
  } catch (error) {
    console.error('Error clearing symbols from localStorage:', error);
  }
}

// Expose cache clear function globally for WebSocket-triggered refreshes
if (typeof window !== 'undefined') {
  (window as any).__clearApiCache = (urlPattern?: string) => {
    if (!urlPattern) {
      console.log('🗑️ [Cache] Clearing ALL cached API responses');
      apiCache.clear();
      return;
    }
    
    let clearedCount = 0;
    for (const key of apiCache.keys()) {
      if (key.includes(urlPattern)) {
        apiCache.delete(key);
        clearedCount++;
      }
    }
    console.log(`🗑️ [Cache] Cleared ${clearedCount} cached entries matching: ${urlPattern}`);
  };
  
  // Expose function to clear symbols from storage
  (window as any).__clearSymbolsCache = clearSymbolsFromStorage;
}

// Widget API routes that should be cached
const CACHED_ROUTES = [
  '/api/central-banks',
  '/api/cot/',
  '/api/economic-data/',
  '/api/heatmaps/',
  '/api/news/',
  '/api/retail-sentiment/',
  '/api/seasonality/',
  // PMT routes (excluding get*, update*, copy*, insert*, query*, notifications*, next*, save*, endpoint*)
  '/api/pmt/get-symbols',
  '/api/pmt/analyst-report-read',
  '/api/pmt/analyst-report-summary',
  '/api/pmt/analyst-reports',
  '/api/pmt/analyst-reports-detail',
  '/api/pmt/available-macro-events',
  '/api/pmt/average-daily-range',
  '/api/pmt/average-range-histogram',
  '/api/pmt/distribution-chart',
  '/api/pmt/distribution-statistics',
  '/api/pmt/fx-options-expiry',
  '/api/pmt/fx-volatility-levels',
  '/api/pmt/heatmap-config',
  '/api/pmt/macro-chart-data',
  '/api/pmt/macro-chart-raw',
  '/api/pmt/macro-dropdown',
  '/api/pmt/macro-events-by-tab',
  '/api/pmt/macro-table-data',
  '/api/pmt/macro-table-data-direct',
  '/api/pmt/macro-tabs',
  '/api/pmt/range-probability',
  '/api/pmt/research-file-by-id',
  '/api/pmt/research-file-read',
  '/api/pmt/research-file-summary',
  '/api/pmt/research-files',
  '/api/pmt/research-institutes',
  '/api/pmt/risk-reversals',
  '/api/pmt/smart-bias-chart-data',
  '/api/pmt/smart-bias-currencies-overview',
  '/api/pmt/smart-bias-summary',
  '/api/pmt/smart-bias-summary-date-range',
  '/api/pmt/smart-bias-summary-overview',
  '/api/pmt/smart-bias-tracker',
  '/api/pmt/smart-bias-tracker-date-range',
  '/api/pmt/smart-bias-tracker-date-ranges',
  '/api/pmt/volatility-statistics',
  '/api/pmt/week-ahead',
];

function shouldCache(url: string): boolean {
  return CACHED_ROUTES.some(route => url.includes(route));
}

function getCacheKey(url: string, body?: string): string {
  if (!body) return url;
  try {
    const parsed = JSON.parse(body);
    return `${url}::${JSON.stringify(parsed, Object.keys(parsed).sort())}`;
  } catch {
    return `${url}::${body}`;
  }
}

/**
 * Client-side component that enables API response caching
 */
export function CacheProvider({ children }: { children: React.ReactNode }) {
  const patchedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (patchedRef.current) return;
    
    // Mark as patched immediately
    patchedRef.current = true;
    
    // Store the REAL original fetch
    const realFetch = window.fetch;
    
    // Create patched version
    const patchedFetch = async function(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      // Get URL
      let url: string;
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
      } else {
        return realFetch(input, init);
      }

      // Only cache specific widget API routes with GET/POST
      const method = init?.method?.toUpperCase() || 'GET';
      if (!shouldCache(url) || (method !== 'GET' && method !== 'POST')) {
        return realFetch(input, init);
      }

      // Check for cache bypass header (used by WebSocket-triggered refreshes)
      const headers = init?.headers;
      let bypassCache = false;
      if (headers) {
        if (headers instanceof Headers) {
          bypassCache = headers.get('x-bypass-cache') === 'true';
        } else if (Array.isArray(headers)) {
          bypassCache = headers.some(([key, value]) => key.toLowerCase() === 'x-bypass-cache' && value === 'true');
        } else {
          bypassCache = (headers as Record<string, string>)['x-bypass-cache'] === 'true';
        }
      }

      // Get body for cache key
      let body: string | undefined;
      if (init?.body && typeof init.body === 'string') {
        body = init.body;
      }

      const cacheKey = getCacheKey(url, body);
      
      // If bypassing cache, delete existing cache entry
      if (bypassCache) {
        apiCache.delete(cacheKey);
        inFlightRequests.delete(cacheKey);
        console.log(`🔄 [Cache BYPASS] ${url}`);
      }
      
      // For get-symbols endpoint, check localStorage first
      if (!bypassCache && isGetSymbolsEndpoint(url)) {
        const storedData = getSymbolsFromStorage(cacheKey);
        if (storedData) {
          console.log(`💾 [Storage HIT] ${url}`);
          return new Response(JSON.stringify(storedData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Check cache (unless bypassing)
      if (!bypassCache) {
        const cached = apiCache.get(cacheKey);
        if (cached) {
          console.log(`📦 [Cache HIT] ${url}`);
          return new Response(JSON.stringify(cached.data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Check if request is already in-flight
        const inFlight = inFlightRequests.get(cacheKey);
        if (inFlight) {
          console.log(`⏳ [Cache WAIT] ${url}`);
          // Wait for the in-flight request and return cached data
          await inFlight;
          
          // Check localStorage first for get-symbols
          if (isGetSymbolsEndpoint(url)) {
            const storedData = getSymbolsFromStorage(cacheKey);
            if (storedData) {
              return new Response(JSON.stringify(storedData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }
          
          // Fall back to memory cache
          const cached = apiCache.get(cacheKey);
          if (cached) {
            return new Response(JSON.stringify(cached.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      }

      // Cache miss - use real fetch
      console.log(`🌐 [Cache MISS] ${url}`);
      
      // Create promise for this request and store it
      const fetchPromise = realFetch(input, init).then(async (response) => {
        // Handle 401 Unauthorized - redirect to login
        handle401Response(response);
        
        if (response.ok) {
          try {
            const clone = response.clone();
            const data = await clone.json();
            
            // Store in memory cache
            apiCache.set(cacheKey, { data, timestamp: Date.now() });
            
            // For get-symbols, also store in localStorage
            if (isGetSymbolsEndpoint(url)) {
              saveSymbolsToStorage(cacheKey, data);
              console.log(`💾 [Storage SAVE] ${url}`);
            }
          } catch {
            // Not JSON, don't cache
          }
        }
        
        return response;
      }).finally(() => {
        // Remove from in-flight tracking when done
        inFlightRequests.delete(cacheKey);
      });
      
      // Track this in-flight request
      inFlightRequests.set(cacheKey, fetchPromise);
      
      return fetchPromise;
    };

    // Apply patch
    window.fetch = patchedFetch;
    console.log('🚀 [CachedFetch] Widget API caching enabled');

    return () => {
      window.fetch = realFetch;
      patchedRef.current = false;
    };
  }, []);

  return <>{children}</>;
}
