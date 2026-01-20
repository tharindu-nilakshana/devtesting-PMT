/**
 * useWidgetData Hook
 * 
 * A custom hook for widget data fetching with built-in caching.
 * This hook prevents unnecessary API calls when switching between tabs or templates
 * since widget data is updated via WebSocket in real-time.
 * 
 * Features:
 * - Automatic caching with configurable TTL
 * - Cache check before API calls
 * - Manual refresh capability
 * - Loading and error states
 * - Type-safe data handling
 * 
 * Usage:
 * 
 * ```typescript
 * const { data, loading, error, refresh } = useWidgetData<COTChartData>({
 *   widgetType: 'cot-history-chart',
 *   params: { symbol, dataType, owner },
 *   fetchFn: async () => {
 *     const response = await fetch('/api/cot/cot-history-chart', { ... });
 *     const result = await response.json();
 *     return result.data;
 *   },
 *   enabled: true, // optional, defaults to true
 *   ttl: 5 * 60 * 1000, // optional, defaults to 5 minutes
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { widgetDataCache } from './widgetDataCache';

export interface UseWidgetDataOptions<T> {
  /** Widget type identifier for cache key generation */
  widgetType: string;
  /** Parameters that uniquely identify the data request */
  params: Record<string, unknown>;
  /** Function to fetch data from the API */
  fetchFn: () => Promise<T>;
  /** Whether to enable fetching. Useful for conditional fetching. Default: true */
  enabled?: boolean;
  /** Time to live for cached data in milliseconds. Default: 5 minutes */
  ttl?: number;
  /** Initial data to use before fetching */
  initialData?: T | null;
  /** Callback when data is successfully fetched */
  onSuccess?: (data: T) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Whether to skip cache and always fetch fresh data. Default: false */
  skipCache?: boolean;
}

export interface UseWidgetDataResult<T> {
  /** The fetched/cached data */
  data: T | null;
  /** Whether a fetch is in progress */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Force refresh the data (bypasses cache) */
  refresh: () => Promise<void>;
  /** Check if data came from cache */
  isFromCache: boolean;
  /** Manually set the data (useful for WebSocket updates) */
  setData: (data: T | null) => void;
  /** Invalidate the cache for this widget */
  invalidateCache: () => void;
}

export function useWidgetData<T>(options: UseWidgetDataOptions<T>): UseWidgetDataResult<T> {
  const {
    widgetType,
    params,
    fetchFn,
    enabled = true,
    ttl,
    initialData = null,
    onSuccess,
    onError,
    skipCache = false,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Track if we've fetched for the current params
  const lastFetchedParamsRef = useRef<string>('');
  const isMountedRef = useRef(true);

  // Generate cache key
  const cacheKey = widgetDataCache.generateKey(widgetType, params);

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    if (!enabled) {
      return;
    }

    // Check cache first (unless force refresh or skipCache)
    if (!forceRefresh && !skipCache) {
      const cachedData = widgetDataCache.get<T>(cacheKey);
      if (cachedData) {
        console.log(`📦 [useWidgetData] Cache hit for ${widgetType}`);
        setData(cachedData);
        setIsFromCache(true);
        setLoading(false);
        setError(null);
        onSuccess?.(cachedData);
        return;
      }
    }

    // Prevent duplicate fetches for the same params
    const paramsKey = JSON.stringify(params);
    if (!forceRefresh && lastFetchedParamsRef.current === paramsKey && data !== null) {
      console.log(`⏭️ [useWidgetData] Skipping duplicate fetch for ${widgetType}`);
      return;
    }

    setLoading(true);
    setError(null);
    setIsFromCache(false);

    try {
      console.log(`🚀 [useWidgetData] Fetching ${widgetType}...`);
      const result = await fetchFn();

      if (!isMountedRef.current) {
        return; // Component unmounted, don't update state
      }

      // Cache the result
      widgetDataCache.set(cacheKey, result, { ttl });
      lastFetchedParamsRef.current = paramsKey;

      setData(result);
      setLoading(false);
      onSuccess?.(result);
    } catch (err) {
      if (!isMountedRef.current) {
        return; // Component unmounted, don't update state
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ [useWidgetData] Error fetching ${widgetType}:`, errorMessage);
      setError(errorMessage);
      setLoading(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [enabled, skipCache, cacheKey, widgetType, params, data, fetchFn, ttl, onSuccess, onError]);

  // Fetch on mount and when params change
  useEffect(() => {
    isMountedRef.current = true;
    
    if (enabled) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled]); // Use cacheKey as dependency since it encapsulates params

  // Refresh function (bypasses cache)
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Invalidate cache for this widget
  const invalidateCache = useCallback(() => {
    widgetDataCache.invalidate(cacheKey);
  }, [cacheKey]);

  // Allow manual data setting (useful for WebSocket updates)
  const setDataManually = useCallback((newData: T | null) => {
    setData(newData);
    if (newData !== null) {
      // Update cache with new data
      widgetDataCache.set(cacheKey, newData, { ttl });
    }
  }, [cacheKey, ttl]);

  return {
    data,
    loading,
    error,
    refresh,
    isFromCache,
    setData: setDataManually,
    invalidateCache,
  };
}

export default useWidgetData;
