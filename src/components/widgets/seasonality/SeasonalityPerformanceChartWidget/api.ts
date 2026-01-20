// Seasonality Performance Chart API

export interface ChartLabel {
  label: string;
  showLabel?: string;
  vline?: string;
  lineposition?: string;
  thickness?: string;
  color?: string;
  dashed?: string;
}

export interface ChartValue {
  value: string;
}

// API response structure from the external API
export interface SeasonalityPerformanceApiData {
  success: boolean;
  symbol: string;
  SymbolPart: string;
  cslabel: ChartLabel[];
  years10: ChartValue[];
  years5: ChartValue[];
  yearsall: ChartValue[];
  currentval: ChartValue[];
  summary: {
    totalDataPoints: number;
    symbolPart: string;
    todayDate: string;
    dataRange: {
      startDate: string;
      endDate: string;
    };
  };
}

// Response from our Next.js API
export interface SeasonalityPerformanceResponse {
  success: boolean;
  data: SeasonalityPerformanceApiData;
  meta?: {
    symbol: string;
    chartType: string;
    module: string;
    timestamp: number;
  };
  error?: string;
}

export async function fetchSeasonalityPerformanceData(params: {
  symbol?: string;
  additionalSettings?: 'bar' | 'line';
  baseYear?: string;
}): Promise<SeasonalityPerformanceResponse> {
  const res = await fetch('/api/seasonality/seasonality-performance-chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API request failed: ${res.status} ${res.statusText} ${text}`);
  }
  
  return (await res.json()) as SeasonalityPerformanceResponse;
}
