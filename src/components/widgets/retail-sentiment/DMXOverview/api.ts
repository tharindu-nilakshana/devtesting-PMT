"use client";

export interface DMXOverviewApiRow {
  pair: string;
  dates: string[];
  shortData: number[];
  longData: number[];
}

export interface DMXOverviewApiResponse {
  status: string;
  data: DMXOverviewApiRow[];
}

export interface DMXOverviewResponse {
  success: boolean;
  data?: PairData[];
  error?: string;
  timestamp?: number;
}

export interface PairData {
  pair: string;
  long: number;
  short: number;
}

const DEFAULT_TIMEOUT = 20000;

/**
 * Transform API response to PairData format
 * Uses the latest values from shortData and longData arrays
 * Filters results to only include pairs that match the requested symbols
 */
function transformOverviewData(
  rows: DMXOverviewApiRow[],
  requestedSymbols?: string[]
): PairData[] {
  if (!Array.isArray(rows)) return [];

  // Convert requested symbols to API format for comparison (remove slashes, uppercase)
  const requestedPairs = requestedSymbols
    ? new Set(requestedSymbols.map(s => s.replace('/', '').toUpperCase()))
    : null;

  return rows
    .map((row) => {
      // Filter: if we have requested symbols, only include matching pairs
      if (requestedPairs && !requestedPairs.has(row.pair)) {
        return null;
      }

      // Get the latest values from the arrays (last element)
      const shortValue = row.shortData && row.shortData.length > 0 
        ? row.shortData[row.shortData.length - 1] 
        : 0;
      const longValue = row.longData && row.longData.length > 0 
        ? row.longData[row.longData.length - 1] 
        : 0;

      // Format pair name: convert "EURUSD" to "EUR/USD" for display (only for 6-char forex pairs)
      // For other symbols (commodities, indices), keep as-is
      const formattedPair = row.pair.length === 6 && /^[A-Z]{6}$/.test(row.pair)
        ? `${row.pair.substring(0, 3)}/${row.pair.substring(3, 6)}`
        : row.pair;

      return {
        pair: formattedPair,
        long: longValue,
        short: shortValue,
      };
    })
    .filter((point): point is PairData => point !== null && point.long >= 0 && point.short >= 0);
}

/**
 * Map widget timeFrame to API interval format
 */
function mapTimeFrameToInterval(timeFrame: string): string {
  const mapping: Record<string, string> = {
    '1h': '1h',
    '4h': '4h',
    'daily': '1d',
    'monthly': '1m',
  };
  return mapping[timeFrame] || '1h';
}

/**
 * Convert symbol format from widget to API format
 * - Forex pairs: "EUR/USD" -> "EURUSD"
 * - Indices/Commodities: "SPX500" -> "SPX500" (no change needed, already correct format)
 */
function formatSymbolForApi(symbol: string): string {
  // Remove slashes for forex pairs, otherwise keep as-is (already uppercase)
  return symbol.replace('/', '').toUpperCase();
}

export async function fetchDMXOverview(
  symbols: string[],
  timeFrame: string,
  dataType: string = 'Percentage',
  signal?: AbortSignal
): Promise<DMXOverviewResponse> {
  // Store original symbols for filtering
  const originalSymbols = symbols;
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
    : undefined;

  try {
    // Convert symbols to API format and join with comma
    const apiSymbols = symbols.map(formatSymbolForApi).join(',');
    const apiInterval = mapTimeFrameToInterval(timeFrame);

    const response = await fetch('/api/retail-sentiment/dmx-overview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataType,
        interval: apiInterval,
        symbols: apiSymbols,
      }),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: response.status === 401
          ? 'Authentication required to view DMX overview data.'
          : `Failed to fetch data (${response.status})`,
      };
    }

    const result = await response.json();
    
    if (!result.success || !result.data?.data) {
      return {
        success: false,
        error: result.error ?? 'Failed to fetch DMX overview data',
      };
    }

    const transformedData = transformOverviewData(result.data.data, originalSymbols);

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

