import { ssrFetch } from '@/lib/ssr/utils';
import type { SSRFetchConfig, SSRFetchResult } from '@/lib/ssr/types';

// Data processing function (moved from page.tsx)
const mapUpstreamToRows = (payload: unknown, symbol: string) => {
  const root = (payload as Record<string, unknown>) || {};
  const data: unknown = (root && typeof root === 'object' && 'data' in root)
    ? (root as Record<string, unknown>).data
    : payload;
  
  let responseSymbol: string = symbol;
  if (root && typeof root === 'object' && 'symbol' in root) {
    const symVal = (root as Record<string, unknown>).symbol;
    if (typeof symVal === 'string' && symVal) {
      responseSymbol = symVal;
    }
  }

  const getArray = (obj: unknown, key: string): unknown[] => {
    const rec = (obj as Record<string, unknown>) || {};
    const val = rec[key];
    return Array.isArray(val) ? (val as unknown[]) : [];
  };

  const determineTrend = (prognosis: number): 'bullish' | 'bearish' | 'neutral' => {
    const threshold = 0.05;
    if (prognosis > threshold) return 'bullish';
    if (prognosis < -threshold) return 'bearish';
    return 'neutral';
  };

  const horizonsUnknown = getArray(data, 'ForecastHorizon').length > 0
    ? getArray(data, 'ForecastHorizon')
    : getArray(data, 'ForecastHorizons');
  const datesUnknown = getArray(data, 'SeasonalityDate');
  const probabilitiesUnknown = getArray(data, 'Probability');
  const prognosisUnknown = getArray(data, 'SeasonalPrognosis');
  const changeValuesUnknown = getArray(data, 'ChangeValues');

  const horizons: string[] = horizonsUnknown.map((v) => String(v));
  const dates: string[] = datesUnknown.map((v) => String(v));
  const probabilities: string[] = probabilitiesUnknown.map((v) => String(v));
  const prognosisArr: string[] = prognosisUnknown.map((v) => String(v));
  const changeValues: string[] = changeValuesUnknown.map((v) => String(v));

  if (!Array.isArray(horizons) || horizons.length === 0) {
    return [];
  }

  return horizons.map((h: unknown, idx: number) => {
    const prob = parseInt(probabilities[idx] ?? '0', 10) || 0;
    const prog = parseFloat(prognosisArr[idx] ?? '0') || 0;
    const date = dates[idx] || '';
    const change = changeValues[idx] || '0 Pips';
    return {
      symbol: responseSymbol,
      horizon: String(h),
      date,
      probability: prob,
      prognosis: Math.round(prog * 100) / 100,
      changeValue: change,
      trend: determineTrend(prog),
    };
  });
};

/**
 * Fetch SSR data for Seasonality Forecast Table widget
 */
export async function fetchSeasonalityForecastTableSSR(
  config: SSRFetchConfig,
  symbol: string = 'EURUSD'
): Promise<SSRFetchResult> {
  const result = await ssrFetch(
    'getSeasonalityForecastTable',
    {
      GetSeasonalityForecastTable: true,
      symbol,
      module: 'Forex',
    },
    config,
    (upstream) => {
      const rows = mapUpstreamToRows(upstream?.data ?? upstream, symbol);
      return {
        success: true,
        data: rows,
        meta: {
          symbol,
          module: 'Forex',
          totalRecords: rows.length,
          timestamp: Date.now(),
        },
      };
    }
  );

  return result;
}
