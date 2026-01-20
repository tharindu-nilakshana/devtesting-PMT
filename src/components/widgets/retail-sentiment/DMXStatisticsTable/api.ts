"use client";

export interface DMXTableApiResponse {
  status: string;
  chartdata: Array<{
    label: string;
    value: number;
    color: string;
    tooltext: string;
    isSliced?: string;
  }>;
}

export interface StatisticsData {
  longPositions: number;
  shortPositions: number;
  totalPositions: number;
  avgLongPrice: number;
  avgShortPrice: number;
  longRatio: string;
  shortRatio: string;
  longVolume: string;
  shortVolume: string;
  lossPercentage: string;
}

export interface DMXStatisticsTableResponse {
  success: boolean;
  data?: StatisticsData;
  error?: string;
  timestamp?: number;
}

const DEFAULT_TIMEOUT = 20000;

/**
 * Transform API response to StatisticsData format
 * 
 * API Response Structure:
 * {
 *   "status": "success",
 *   "chartdata": [
 *     {
 *       "label": "Short",
 *       "value": 18743867.63,  // Volume in lots
 *       "color": "#FD2E64",
 *       "tooltext": "Short{br}18743867.630 Lots"  // Only contains volume info
 *     },
 *     {
 *       "label": "Long",
 *       "value": 5381504.69,  // Volume in lots
 *       "color": "#01B298",
 *       "tooltext": "Long{br}5381504.690 Lots",  // Only contains volume info
 *       "isSliced": "1"
 *     }
 *   ]
 * }
 * 
 * Note: Average prices are NOT available in this API response.
 * The tooltext field only contains volume information, not price data.
 * Average prices would need to come from a different endpoint.
 */
function transformStatisticsData(
  apiResponse: DMXTableApiResponse,
  symbol: string
): StatisticsData {
  const longData = apiResponse.chartdata?.find(item => item.label === 'Long');
  const shortData = apiResponse.chartdata?.find(item => item.label === 'Short');

  const longVolume = longData?.value || 0;
  const shortVolume = shortData?.value || 0;
  const totalVolume = longVolume + shortVolume;

  // Calculate ratios from volumes
  const longRatio = totalVolume > 0 ? (longVolume / totalVolume).toFixed(2) : '0.00';
  const shortRatio = totalVolume > 0 ? (shortVolume / totalVolume).toFixed(2) : '0.00';

  // For positions, we'll estimate based on volume (assuming average position size)
  // This is a placeholder - actual positions data may come from a different endpoint
  // Using a reasonable assumption: average position size of 1 lot
  const longPositions = Math.round(longVolume);
  const shortPositions = Math.round(shortVolume);
  const totalPositions = longPositions + shortPositions;

  // Average prices are NOT available in this API response
  // The API only returns volume data, not price information
  // These would need to come from a different endpoint or be calculated separately
  const avgLongPrice = 0; // Not available from this endpoint
  const avgShortPrice = 0; // Not available from this endpoint

  // Format volumes to 2 decimals (will be formatted in component based on user preference)
  const longVolumeFormatted = longVolume.toFixed(2);
  const shortVolumeFormatted = shortVolume.toFixed(2);

  // Loss percentage - placeholder (may need separate endpoint)
  // Using a default value based on typical retail trading statistics
  const lossPercentage = '72.5'; // Placeholder - typical retail trading loss percentage

  return {
    longPositions,
    shortPositions,
    totalPositions,
    avgLongPrice,
    avgShortPrice,
    longRatio,
    shortRatio,
    longVolume: longVolumeFormatted,
    shortVolume: shortVolumeFormatted,
    lossPercentage,
  };
}

/**
 * Convert symbol format from widget (EUR/USD) to API (EURUSD)
 * Also handles other formats like "NASDAQ:AAPL" -> "AAPL" for US Stocks
 */
function formatSymbolForApi(symbol: string): string {
  // Remove slashes and spaces, convert to uppercase
  let formatted = symbol.replace(/[\/\s]/g, '').toUpperCase();
  
  // For US Stocks, remove exchange prefix (e.g., "NASDAQ:AAPL" -> "AAPL")
  if (formatted.includes(':')) {
    formatted = formatted.split(':')[1];
  }
  
  return formatted;
}

/**
 * Generate AdditionalSettings from symbol
 * Format: "EUR|LotPie|1" where EUR is the first 3 chars of EURUSD
 */
function generateAdditionalSettings(symbol: string): string {
  const cleanSymbol = formatSymbolForApi(symbol);
  if (cleanSymbol.length >= 3) {
    const symbolPart = cleanSymbol.substring(0, 3);
    return `${symbolPart}|LotPie|1`;
  }
  return '';
}

export async function fetchDMXStatisticsTable(
  symbol: string,
  signal?: AbortSignal
): Promise<DMXStatisticsTableResponse> {
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
    : undefined;

  try {
    const apiSymbol = formatSymbolForApi(symbol);
    const additionalSettings = generateAdditionalSettings(symbol);

    const response = await fetch('/api/retail-sentiment/dmx-statistics-table', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: apiSymbol,
        symbols: apiSymbol,
        module: 'single_currency',
        additionalSettings,
      }),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: response.status === 401
          ? 'Authentication required to view DMX statistics data.'
          : `Failed to fetch data (${response.status})`,
      };
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error ?? 'Failed to fetch DMX statistics table data',
      };
    }

    const transformedData = transformStatisticsData(result.data, symbol);

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

