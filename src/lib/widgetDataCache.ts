/**
 * Widget Data Cache Service
 * 
 * This service provides a global in-memory cache for widget data to prevent
 * unnecessary API calls when switching between tabs or templates.
 * 
 * Since widget data is updated via WebSocket in real-time, we don't need to
 * re-fetch data on every mount. The cache stores data with a configurable TTL
 * and can be invalidated manually when needed (e.g., when settings change).
 * 
 * Usage in widgets:
 * 
 * ```typescript
 * import { widgetDataCache } from '@/lib/widgetDataCache';
 * 
 * // In your widget component:
 * const cacheKey = widgetDataCache.generateKey('cot-chart', { symbol, dataType, owner });
 * const cachedData = widgetDataCache.get(cacheKey);
 * 
 * if (cachedData) {
 *   setData(cachedData);
 *   return; // Skip API call
 * }
 * 
 * // Fetch from API and cache the result
 * const data = await fetchFromAPI();
 * widgetDataCache.set(cacheKey, data);
 * setData(data);
 * ```
 */

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  /** Time to live in milliseconds. Default: 5 minutes */
  ttl?: number;
  /** Whether to skip caching for this entry. Default: false */
  skipCache?: boolean;
}

// Default TTL: 5 minutes (WebSocket keeps data fresh, cache is just for mount protection)
const DEFAULT_TTL = 5 * 60 * 1000;

// Maximum cache size to prevent memory leaks
const MAX_CACHE_SIZE = 100;

class WidgetDataCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // LRU tracking

  /**
   * Generate a unique cache key for a widget based on its type and parameters
   */
  generateKey(widgetType: string, params: Record<string, unknown>): string {
    // Sort keys for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        const value = params[key];
        // Only include non-null, non-undefined values
        if (value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>);
    
    return `${widgetType}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      console.log(`🗑️ [WidgetCache] Cache expired for key: ${key.substring(0, 50)}...`);
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    
    console.log(`✅ [WidgetCache] Cache hit for key: ${key.substring(0, 50)}...`);
    return entry.data as T;
  }

  /**
   * Store data in the cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    if (options.skipCache) {
      return;
    }

    const ttl = options.ttl ?? DEFAULT_TTL;

    // Enforce max cache size using LRU eviction
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    this.updateAccessOrder(key);
    console.log(`💾 [WidgetCache] Cached data for key: ${key.substring(0, 50)}... (TTL: ${ttl}ms)`);
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      console.log(`🗑️ [WidgetCache] Invalidated cache for key: ${key.substring(0, 50)}...`);
    }
  }

  /**
   * Invalidate all cache entries for a specific widget type
   */
  invalidateByType(widgetType: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${widgetType}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`🗑️ [WidgetCache] Invalidated ${keysToDelete.length} entries for widget type: ${widgetType}`);
    }
  }

  /**
   * Invalidate all cache entries containing a specific widget ID
   */
  invalidateByWidgetId(widgetId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(`"widgetId":"${widgetId}"`) || key.includes(`"wgid":"${widgetId}"`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`🗑️ [WidgetCache] Invalidated ${keysToDelete.length} entries for widget ID: ${widgetId}`);
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    console.log(`🗑️ [WidgetCache] Cleared entire cache (${size} entries)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Check if data exists in cache without retrieving it
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }

    return true;
  }

  /**
   * Refresh the TTL for an existing cache entry (useful when WebSocket updates data)
   */
  refreshTTL(key: string, newTTL?: number): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.timestamp = Date.now();
      if (newTTL !== undefined) {
        entry.ttl = newTTL;
      }
      console.log(`🔄 [WidgetCache] Refreshed TTL for key: ${key.substring(0, 50)}...`);
    }
  }

  /**
   * Update cached data without resetting TTL (useful for WebSocket updates)
   */
  update<T>(key: string, data: T): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      entry.data = data;
      console.log(`🔄 [WidgetCache] Updated data for key: ${key.substring(0, 50)}...`);
      return true;
    }
    return false;
  }

  // LRU helper methods
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        console.log(`🗑️ [WidgetCache] Evicted LRU entry: ${oldestKey.substring(0, 50)}...`);
      }
    }
  }
}

// Export singleton instance
export const widgetDataCache = new WidgetDataCache();

// Export class for testing purposes
export { WidgetDataCache };
