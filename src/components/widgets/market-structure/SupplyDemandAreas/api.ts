/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SupplyDemandAreaData {
  label: Array<{
    label: string;
    x: string;
    showVerticalLine: string;
  }>;
  candle: Array<{
    label: string;
    open: number;
    high: number;
    low: number;
    close: number;
    x: number;
  }>;
  trendlines: any[];
  min: number;
  max: number;
}

export interface SupplyDemandAreasRequest {
  Symbol: string;
  TVSymbol: string;
  Interval?: string; // "1d", "1h", "1w"
}

/**
 * Fetch supply and demand areas data from the API
 */
export async function fetchSupplyDemandAreas(
  request: SupplyDemandAreasRequest
): Promise<SupplyDemandAreaData> {
  // Use internal API proxy which handles authentication via cookies
  const response = await fetch('/api/pmt/getSupplyAndDemandAreas', {
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
    throw new Error(`Failed to fetch supply and demand areas: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data;
}

