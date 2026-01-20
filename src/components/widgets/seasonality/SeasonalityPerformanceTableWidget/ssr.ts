import { ssrFetch } from '@/lib/ssr/utils';
import type { SSRFetchConfig, SSRFetchResult } from '@/lib/ssr/types';

/**
 * Fetch SSR data for Seasonality Performance Table widget
 */
export async function fetchSeasonalityPerformanceTableSSR(
  config: SSRFetchConfig,
  symbol: string = 'EURUSD'
): Promise<SSRFetchResult> {
  return await ssrFetch(
    'getSeasonalityPerformanceTable',
    {
      GetSeasonalityPerformanceTable: true,
      symbol,
    },
    config
  );
}
