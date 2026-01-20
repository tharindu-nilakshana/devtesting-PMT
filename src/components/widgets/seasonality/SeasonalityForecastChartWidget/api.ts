// Seasonality Forecast Chart API

export interface ChartDataPoint {
  open: number;
  high: number;
  low: number;
  close: number;
  color?: string;
}

export interface SeasonalityForecastChartResponse {
  success: boolean;
  symbol: string;
  baseYear: number;
  category: Array<{ label: string }>;
  chartData: ChartDataPoint[];
  summary?: {
    historicalDataPoints: number;
    predictionDataPoints: number;
    totalDataPoints: number;
    latestPrice: {
      open: number;
      high: number;
      low: number;
      close: number;
      date: string;
    };
    dateRange: {
      historicalStart: string;
      historicalEnd: string;
      predictionStart: string;
      predictionEnd: string;
    };
  };
  error?: string;
}

export async function fetchSeasonalityForecastChart(params: {
  symbol?: string;
  baseYear?: string;
}): Promise<SeasonalityForecastChartResponse> {
  const res = await fetch('/api/seasonality/seasonality-forecast-chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API request failed: ${res.status} ${res.statusText} ${text}`);
  }
  
  return (await res.json()) as SeasonalityForecastChartResponse;
}
