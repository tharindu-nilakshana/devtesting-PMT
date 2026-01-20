// Client-side API functions for Price Targets widget

// API Response structure from getPriceTargets endpoint
export interface ApiPriceTargetResponse {
  success: boolean;
  symbol: string;
  Module: string;
  DateT: Array<{ label: string }>;  // Array of date labels
  High: Array<{ value: number | string; dashed?: string }>;  // High price targets (some may be empty strings)
  Low: Array<{ value: number | string; dashed?: string }>;   // Low price targets (some may be empty strings)
  Mean: Array<{ value: number | string; dashed?: string }>;  // Mean/Average price targets (some may be empty strings)
  YellowLine: Array<{ value: number | string; dashed?: string }>;  // Historical price line (some may be empty strings)
}

// Transformed data structure for Price Targets widget
export interface PriceTargetData {
  current: number;      // Current stock price (from last YellowLine value or first Mean value)
  average: number;     // Average analyst price target (from last Mean value)
  high: number;        // High price target (from last High value)
  low: number;         // Low price target (from last Low value)
  median?: number;      // Median price target (optional, not currently displayed in UI)
}

export interface PriceTargetsData {
  targetPriceData: PriceTargetData;
  historicalPrices: number[];  // Array of historical price points from YellowLine (filtered to remove empty values)
}

// Transform API response to widget data structure
function transformApiResponse(apiData: ApiPriceTargetResponse): PriceTargetsData | null {
  if (!apiData.success) {
    return null;
  }

  // Helper function to extract numeric value from API response
  function extractNumericValue(item: { value: number | string }): number | null {
    if (typeof item.value === 'number') {
      return item.value;
    }
    if (typeof item.value === 'string' && item.value.trim() !== '') {
      const parsed = parseFloat(item.value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  // Extract historical prices from YellowLine (filter out empty values)
  const historicalPrices = apiData.YellowLine
    .map(extractNumericValue)
    .filter((val): val is number => val !== null);

  // Get the last valid values for price targets
  const getLastValidValue = (arr: Array<{ value: number | string }>): number | null => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const val = extractNumericValue(arr[i]);
      if (val !== null) return val;
    }
    return null;
  };

  // Get first valid value (for current price if needed)
  const getFirstValidValue = (arr: Array<{ value: number | string }>): number | null => {
    for (let i = 0; i < arr.length; i++) {
      const val = extractNumericValue(arr[i]);
      if (val !== null) return val;
    }
    return null;
  };

  const high = getLastValidValue(apiData.High);
  const low = getLastValidValue(apiData.Low);
  const average = getLastValidValue(apiData.Mean);
  const current = historicalPrices.length > 0 
    ? historicalPrices[historicalPrices.length - 1] 
    : getFirstValidValue(apiData.Mean);

  if (high === null || low === null || average === null || current === null) {
    return null;
  }

  return {
    targetPriceData: {
      current,
      average,
      high,
      low,
    },
    historicalPrices,
  };
}

// Fetch price targets data
export async function fetchPriceTargets(
  symbol: string,
  module: string = 'Forex'
): Promise<PriceTargetsData | null> {
  try {
    console.log('📊 [Price Targets] Fetching data:', { symbol, module });

    const response = await fetch('/api/pmt/get-price-targets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        symbol: symbol.trim().toUpperCase(),
        Module: module,
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn('🔐 [Price Targets] Authentication required');
        throw new Error('Authentication required. Please log in to view price targets data.');
      }
      
      if (response.status === 408) {
        console.warn('⏰ [Price Targets] Request timeout');
        throw new Error('Request timeout - please try again');
      }

      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Price Targets] API returned error:', response.status, errorData.error);
      throw new Error(errorData.error || `Failed to fetch price targets: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.warn('⚠️ [Price Targets] API returned unsuccessful response:', result);
      return null;
    }

    // Transform the API response
    const transformedData = transformApiResponse(result.data);
    
    if (!transformedData) {
      console.warn('⚠️ [Price Targets] Failed to transform API response');
      return null;
    }

    console.log('✅ [Price Targets] Data fetched successfully:', {
      current: transformedData.targetPriceData.current,
      average: transformedData.targetPriceData.average,
      high: transformedData.targetPriceData.high,
      low: transformedData.targetPriceData.low,
      historicalPricesCount: transformedData.historicalPrices.length,
    });

    return transformedData;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('⏰ [Price Targets] Request timeout');
      throw new Error('Request timeout - please try again');
    }
    console.error('❌ [Price Targets] Error fetching price targets:', error);
    throw error;
  }
}

