// Seasonality Forecast API

export interface ChartDataPoint {
  open: number;
  high: number;
  low: number;
  close: number;
  color?: string;
}

export interface SeasonalityForecastData {
  success: boolean;
  symbol: string;
  baseYear: string;
  dataCount: number;
  chartDate: string[];
  maxval: number;
  minval: number;
  chartData: string[];
  summary: {
    totalPredictions: number;
    maxSeasonalPrognosis: number;
    minSeasonalPrognosis: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  error?: string;
}

export async function fetchSeasonalityForecast(params: {
  symbol?: string;
  baseYear?: string;
}): Promise<SeasonalityForecastData> {
  const res = await fetch('/api/seasonality/seasonality-forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API request failed: ${res.status} ${res.statusText} ${text}`);
  }
  
  return (await res.json()) as SeasonalityForecastData;
}
