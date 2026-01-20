/* eslint-disable @typescript-eslint/no-unused-vars */
import type { SSRFetchConfig, SSRFetchResult } from '@/lib/ssr/types';

/**
 * Fetch SSR data for Realtime Headline Ticker widget
 * Currently disabled for SSR - will load client-side
 */
export async function fetchRealtimeNewsSSR(
  config: SSRFetchConfig
): Promise<SSRFetchResult> {
  // Skip for now (will load client-side)  
  return {
    success: false,
    data: null,
    error: 'Client-side loading only',
  };
}
