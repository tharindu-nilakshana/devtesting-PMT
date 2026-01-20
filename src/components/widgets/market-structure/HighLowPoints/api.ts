/* eslint-disable @typescript-eslint/no-explicit-any */

export interface HighLowPointData {
  label: Array<{
    label: string;
    x: string;
    showVerticalLine: string;
  }>;
  high: Array<{
    value: string;
    showValue?: string;
  }>;
  low: Array<{
    value: string;
    showValue?: string;
  }>;
  highlowx: Array<{
    label: string; // Unix timestamp
    value: string; // Price value
    color: string; // Color code (#01B298 for highs, #FD2E64 for lows)
    position: 'aboveBar' | 'belowBar';
  }>;
  min: number;
  max: number;
  candle: Array<{
    label: string; // Unix timestamp
    open: number;
    high: number;
    low: number;
    close: number;
    x: number;
  }>;
}

export interface HighLowPointsRequest {
  Symbol: string;
  TVSymbol: string;
  Interval?: string; // "1d", "1h", "1w"
}

/**
 * Fetch high and low points data from the API
 */
export async function fetchHighLowPoints(
  request: HighLowPointsRequest
): Promise<HighLowPointData> {
  // Use internal API proxy which handles authentication via cookies
  const response = await fetch('/api/pmt/getHighLowPoints', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Ensure cookies are sent
    body: JSON.stringify({
      Symbol: request.Symbol,
      TVSymbol: request.TVSymbol,
      Interval: request.Interval || '1d',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch high and low points: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data;
}

