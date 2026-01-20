// Seasonality Performance Table API

export interface SeasonalityPerformanceResponse {
  success: boolean;
  data?: string; // HTML table content
  meta?: Record<string, unknown>;
  error?: string;
}

export async function fetchSeasonalityPerformanceTable(params: {
  symbol?: string;
}): Promise<SeasonalityPerformanceResponse> {
  const res = await fetch('/api/seasonality/seasonality-performance-table', {
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
