"use client";

export interface DMXPositioningApiResponse {
  status: string;
  chartdata: Array<{
    label: string;
    value: number;
    color: string;
    tooltext?: string;
    extra?: string;
    isSliced?: string;
  }>;
}

export interface DMXPositioningData {
  short: number;
  long: number;
}

export interface DMXPositioningResponse {
  success: boolean;
  data?: DMXPositioningData;
  error?: string;
  timestamp?: number;
}

const DEFAULT_TIMEOUT = 20000;

/**
 * Transform API response to DMXPositioningData format
 */
function transformPositioningData(
  apiResponse: DMXPositioningApiResponse
): DMXPositioningData {
  const longData = apiResponse.chartdata?.find(item => item.label === 'Long');
  const shortData = apiResponse.chartdata?.find(item => item.label === 'Short');

  const long = longData?.value || 0;
  const short = shortData?.value || 0;

  return {
    long,
    short,
  };
}

/**
 * Convert symbol format from widget (EUR/USD) to API (EURUSD)
 */
function formatSymbolForApi(symbol: string): string {
  // Remove slashes and spaces, convert to uppercase
  return symbol.replace(/[\/\s]/g, '').toUpperCase();
}

export async function fetchDMXPositioning(
  symbol: string,
  module: string = 'Forex',
  signal?: AbortSignal
): Promise<DMXPositioningResponse> {
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
    : undefined;

  try {
    const apiSymbol = formatSymbolForApi(symbol);

    console.log('📊 [DMX Positioning API] Calling /api/retail-sentiment/dmx-positioning with:', {
      symbol: apiSymbol,
      module,
    });

    const response = await fetch('/api/retail-sentiment/dmx-positioning', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: apiSymbol,
        symbols: apiSymbol,
        additionalSettings: 'Percentage',
        module: module,
      }),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: response.status === 401
          ? 'Authentication required to view DMX positioning data.'
          : `Failed to fetch data (${response.status})`,
      };
    }

    const result = await response.json();
    
    console.log('📊 [DMX Positioning API] Response:', result);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? 'Failed to fetch DMX positioning data',
      };
    }

    const transformedData = transformPositioningData(result.data);
    console.log('📊 [DMX Positioning API] Transformed data:', transformedData);

    return {
      success: true,
      data: transformedData,
      timestamp: result.timestamp,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. Please try again.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
