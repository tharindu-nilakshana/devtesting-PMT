import { getSSRConfig } from './utils';
import type { SSRWidgetData } from './types';

// Import widget-specific SSR functions
import { fetchSeasonalityForecastTableSSR } from '@/components/widgets/seasonality/SeasonalityForecastTableWidget/ssr';
import { fetchSeasonalityPerformanceTableSSR } from '@/components/widgets/seasonality/SeasonalityPerformanceTableWidget/ssr';
import { fetchCurrencyStrengthSSR } from '@/components/widgets/heatmaps/Currency Strength/ssr';
import { fetchRealtimeNewsSSR } from '@/components/widgets/news/RealtimeHeadlineTickerWidget/ssr';
import { fetchRiskSentimentSSR } from '@/components/widgets/utilities/RiskSentiment/ssr';

/**
 * Fetch SSR data for all commonly used widgets
 */
export async function fetchCommonWidgetDataSSR(): Promise<SSRWidgetData> {
  const defaultReturn: SSRWidgetData = {
    seasonalityForecast: null,
    seasonalityPerformance: null,
    currencyStrength: null,
    realtimeNews: null,
    riskSentiment: null,
  };

  try {
    const config = await getSSRConfig();
    
    if (!config) {
      console.log('❌ [SSR Dashboard] No auth token found');
      return defaultReturn;
    }

    // console.log('🔐 [SSR Dashboard] Fetching common widget data server-side');

    // Fetch data for commonly used widgets in parallel
    const fetchPromises = await Promise.allSettled([
      fetchSeasonalityForecastTableSSR(config, 'EURUSD'),
      fetchSeasonalityPerformanceTableSSR(config, 'EURUSD'),
      fetchCurrencyStrengthSSR(config),
      fetchRealtimeNewsSSR(config),
      fetchRiskSentimentSSR(config),
    ]);

    const [seasonalityForecast, seasonalityPerformance, currencyStrength, realtimeNews, riskSentiment] = 
      fetchPromises.map(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          return result.value.data;
        }
        return null;
      });

    // console.log('✅ [SSR Dashboard] Widget data fetched:', {
    //   seasonalityForecast: !!seasonalityForecast,
    //   seasonalityPerformance: !!seasonalityPerformance,
    //   currencyStrength: !!currencyStrength,
    //   realtimeNews: !!realtimeNews,
    //   riskSentiment: !!riskSentiment,
    // });

    return {
      seasonalityForecast,
      seasonalityPerformance,
      currencyStrength,
      realtimeNews,
      riskSentiment,
    };

  } catch (error) {
    console.error('❌ [SSR Dashboard] Error fetching widget data:', error);
    return defaultReturn;
  }
}
