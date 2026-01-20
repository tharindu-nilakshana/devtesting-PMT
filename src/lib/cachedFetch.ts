/**
 * Cached Fetch Wrapper
 * Automatically caches API responses to prevent redundant calls on tab/template switches
 * 
 * Widgets fetch data once, then WebSocket updates keep the cache fresh.
 * When switching tabs/templates, cached data is returned instantly.
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

class CachedFetchService {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes for non-widget routes
  private originalFetch: typeof fetch = fetch; // Store reference to avoid circular calls
  
  // Widget API routes that should be permanently cached (updated only via WebSocket)
  private widgetCachePatterns: RegExp[] = [
    // Central Banks widget
    /\/api\/central-banks/,
    
    // COT widgets
    /\/api\/cot\/cot-history-chart/,
    /\/api\/cot\/cot-history-table/,
    /\/api\/cot\/cot-positioning/,
    
    // Economic Data widgets
    /\/api\/economic-data\/event-calendar/,
    
    // Heatmaps widgets
    /\/api\/heatmaps\/currency-strength/,
    
    // News widgets
    /\/api\/news\/latest-stories/,
    /\/api\/news\/news-sentiment/,
    /\/api\/news\/realtime-news-ticker/,
    /\/api\/news\/trending-topics/,
    /\/api\/news\/dashboard/,
    
    // Retail Sentiment / DMX widgets
    /\/api\/retail-sentiment\/dmx-chart/,
    /\/api\/retail-sentiment\/dmx-open-interest/,
    /\/api\/retail-sentiment\/dmx-overview/,
    /\/api\/retail-sentiment\/dmx-positioning/,
    /\/api\/retail-sentiment\/dmx-statistics-table/,
    
    // Seasonality widgets
    /\/api\/seasonality\/seasonality-forecast/,
    /\/api\/seasonality\/seasonality-forecast-chart/,
    /\/api\/seasonality\/seasonality-forecast-table/,
    /\/api\/seasonality\/seasonality-performance-chart/,
    /\/api\/seasonality\/seasonality-performance-table/,
  ];

  // Routes that should NEVER be cached (mutations, auth, etc.)
  private noCachePatterns: RegExp[] = [
    /\/api\/auth/,
    /\/api\/login/,
    /\/api\/logout/,
    /\/api\/register/,
    /\/api\/.*\/(save|update|delete|create|add|remove)/i,
    /\/api\/template.*save/i,
    /\/api\/grid-position.*save/i,
    /\/api\/tab.*save/i,
    /\/api\/user.*update/i,
    /\/api\/settings.*save/i,
  ];

  /**
   * Check if URL should use permanent cache (only invalidated by WebSocket updates)
   */
  private isWidgetCache(url: string): boolean {
    return this.widgetCachePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL should never be cached
   */
  private isNoCache(url: string): boolean {
    return this.noCachePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Generate a cache key from URL and request body
   */
  private generateCacheKey(url: string, body?: string): string {
    if (!body) return url;
    // Create a simple hash of the body to include in the cache key
    try {
      const parsedBody = JSON.parse(body);
      // Sort keys for consistent cache key
      const sortedBody = JSON.stringify(parsedBody, Object.keys(parsedBody).sort());
      return `${url}::${sortedBody}`;
    } catch {
      return `${url}::${body}`;
    }
  }

  /**
   * Get cached data for a URL
   */
  get(cacheKey: string): unknown | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    // Extract URL from cache key for pattern matching
    const url = cacheKey.split('::')[0];

    // Widget cache URLs don't expire (WebSocket will update them)
    if (this.isWidgetCache(url)) {
      return entry.data;
    }

    // Check TTL for non-widget cache
    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data for a URL
   */
  set(cacheKey: string, data: unknown): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Update cached data (called by WebSocket handlers)
   */
  update(urlOrPattern: string | RegExp, data: unknown): void {
    if (typeof urlOrPattern === 'string') {
      // Find all cache entries that start with this URL
      this.cache.forEach((_, cacheKey) => {
        if (cacheKey.startsWith(urlOrPattern) || cacheKey === urlOrPattern) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          console.log(`🔄 [Cache] Updated: ${cacheKey}`);
        }
      });
    } else {
      this.cache.forEach((_, cacheKey) => {
        const url = cacheKey.split('::')[0];
        if (urlOrPattern.test(url)) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
          console.log(`🔄 [Cache] Updated by pattern: ${cacheKey}`);
        }
      });
    }
  }

  /**
   * Merge update into cached data (for partial WebSocket updates)
   */
  merge(urlOrPattern: string | RegExp, updateFn: (existingData: unknown) => unknown): void {
    if (typeof urlOrPattern === 'string') {
      this.cache.forEach((entry, cacheKey) => {
        if (cacheKey.startsWith(urlOrPattern) || cacheKey === urlOrPattern) {
          this.cache.set(cacheKey, {
            data: updateFn(entry.data),
            timestamp: Date.now()
          });
          console.log(`🔄 [Cache] Merged: ${cacheKey}`);
        }
      });
    } else {
      this.cache.forEach((entry, cacheKey) => {
        const url = cacheKey.split('::')[0];
        if (urlOrPattern.test(url)) {
          this.cache.set(cacheKey, {
            data: updateFn(entry.data),
            timestamp: Date.now()
          });
          console.log(`🔄 [Cache] Merged by pattern: ${cacheKey}`);
        }
      });
    }
  }

  /**
   * Invalidate cache for a specific URL
   */
  invalidate(url: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, cacheKey) => {
      if (cacheKey.startsWith(url) || cacheKey === url) {
        keysToDelete.push(cacheKey);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) {
      console.log(`🗑️ [Cache] Invalidated:`, keysToDelete);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  invalidateByPattern(pattern: RegExp): void {
    const deleted: string[] = [];
    this.cache.forEach((_, cacheKey) => {
      const url = cacheKey.split('::')[0];
      if (pattern.test(url)) {
        this.cache.delete(cacheKey);
        deleted.push(cacheKey);
      }
    });
    if (deleted.length > 0) {
      console.log(`🗑️ [Cache] Invalidated by pattern:`, deleted);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log(`🗑️ [Cache] Cleared all`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; urls: string[] } {
    return {
      size: this.cache.size,
      urls: Array.from(this.cache.keys())
    };
  }

  /**Set the original fetch function to use (prevents infinite recursion)
   */
  setOriginalFetch(fetchFn: typeof fetch): void {
    this.originalFetch = fetchFn;
  }

  /**
   * Cached fetch with explicit original fetch passed in (prevents infinite recursion)
   */
  async fetchWithOriginal(
    url: string, 
    originalFetch: typeof fetch, 
    options?: RequestInit, 
    body?: string
  ): Promise<Response> {
    const method = options?.method?.toUpperCase() || 'GET';
    
    // Skip cache for non-GET/POST or no-cache URLs
    if ((method !== 'GET' && method !== 'POST') || this.isNoCache(url)) {
      return originalFetch(url, options);
    }

    // Only cache widget API routes
    if (!this.isWidgetCache(url)) {
      return originalFetch(url, options);
    }

    // Get body from options if not provided
    if (!body && options?.body) {
      if (typeof options.body === 'string') {
        body = options.body;
      }
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(url, body);

    // Check cache first
    const cached = this.get(cacheKey);
    if (cached !== null) {
      console.log(`📦 [Cache HIT] ${url}`, body ? JSON.parse(body) : '');
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cache miss - fetch from API using the original fetch
    console.log(`🌐 [Cache MISS] ${url}`, body ? JSON.parse(body) : '');
    const response = await originalFetch(url, options);
    
    if (response.ok) {
      const clone = response.clone();
      try {
        const data = await clone.json();
        this.set(cacheKey, data);
      } catch {
        // Not JSON, don't cache
      }
    }

    return response;
  }

  /**
   * Cached fetch - drop-in replacement for fetch
   */
  async fetch(url: string, options?: RequestInit, body?: string): Promise<Response> {
    const method = options?.method?.toUpperCase() || 'GET';
    
    // Skip cache for non-GET/POST or no-cache URLs
    if ((method !== 'GET' && method !== 'POST') || this.isNoCache(url)) {
      return this.originalFetch(url, options);
    }

    // Only cache widget API routes
    if (!this.isWidgetCache(url)) {
      return this.originalFetch(url, options);
    }

    // Get body from options if not provided
    if (!body && options?.body) {
      if (typeof options.body === 'string') {
        body = options.body;
      }
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(url, body);

    // Check cache first
    const cached = this.get(cacheKey);
    if (cached !== null) {
      console.log(`📦 [Cache HIT] ${url}`, body ? JSON.parse(body) : '');
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cache miss - fetch from API
    console.log(`🌐 [Cache MISS] ${url}`, body ? JSON.parse(body) : '');
    const response = await this.originalFetch(url, options);
    
    if (response.ok) {
      const clone = response.clone();
      try {
        const data = await clone.json();
        this.set(cacheKey, data);
      } catch {
        // Not JSON, don't cache
      }
    }

    return response;
  }
}

// Export singleton instance
export const cachedFetch = new CachedFetchService();

// Export a drop-in replacement function
export async function fetchWithCache(url: string, options?: RequestInit): Promise<Response> {
  return cachedFetch.fetch(url, options);
}
