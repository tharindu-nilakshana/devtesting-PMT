import { ssrFetch } from '@/lib/ssr/utils';
import type { SSRFetchConfig, SSRFetchResult } from '@/lib/ssr/types';

/**
 * Fetch SSR data for Seasonality Performance Chart widget
 */
export async function fetchSeasonalityPerformanceChartSSR(
  config: SSRFetchConfig,
  symbol: string = 'EURUSD'
): Promise<SSRFetchResult> {
  // Extract first 3 letters from symbol (e.g., EURUSD -> EUR, AUDCAD -> AUD)
  const symbolPart = symbol.substring(0, 3).toUpperCase();
  
  return await ssrFetch(
    'getSeasonalityPerformanceChart',
    {
      symbol: symbolPart, // Send only the first 3 letters
    },
    config
  );
}
