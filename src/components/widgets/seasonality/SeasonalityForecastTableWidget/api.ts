// Seasonality Forecast Table API

export interface SeasonalityForecastRow {
  symbol: string;
  horizon: string;
  date: string;
  probability: string | number; // Can be string or number from API
  prognosis: string | number; // Can be string or number from API
  changeValue: string;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface SeasonalityForecastResponse {
  success: boolean;
  data: SeasonalityForecastRow[];
  meta?: Record<string, unknown>;
  error?: string;
}

export async function fetchSeasonalityForecastTable(params: {
  symbol?: string;
  module?: string;
}): Promise<SeasonalityForecastResponse> {
  const res = await fetch('/api/seasonality/seasonality-forecast-table', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API request failed: ${res.status} ${res.statusText} ${text}`);
  }
  
  return (await res.json()) as SeasonalityForecastResponse;
}
