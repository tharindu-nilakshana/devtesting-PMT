// TradingView Widget SSR (Server-Side Rendering) support

import { fetchTradingViewData, getUnixForDaysAgo, getCurrentUnixTimestamp } from './api';

export interface TradingViewSSRProps {
  symbol: string;
  timeframe: string;
  days?: number;
}

export interface TradingViewSSRResult {
  initialData: any[];
  ssrSymbol: string;
  ssrTimeframe: string;
}

/**
 * Fetch TradingView data for SSR
 * This function is called on the server to pre-fetch data
 */
export async function fetchTradingViewSSRData({
  symbol = 'EURUSD',
  timeframe = '1h',
  days = 1
}: TradingViewSSRProps): Promise<TradingViewSSRResult> {
  try {
    console.log('🎯 [TradingView SSR] Fetching data for SSR:', { symbol, timeframe, days });
    
    // Calculate time range - Use today's date range since API only has today's data
    const now = getCurrentUnixTimestamp();
    const startOfToday = Math.floor(now / (24 * 60 * 60)) * (24 * 60 * 60); // Start of today in UTC
    
    // For all timeframes, use today's data range
    // The API only provides data for today, so we'll get whatever data is available
    const from = startOfToday;
    
    console.log('📅 [TradingView SSR] Date range calculation:', {
      now: new Date(now * 1000).toISOString(),
      startOfToday: new Date(startOfToday * 1000).toISOString(),
      timeframe,
      from,
      to: now
    });
    
    // Fetch data from API
    const response = await fetchTradingViewData(symbol, timeframe, from, now, false); // Don't clear cache for SSR
    
    console.log('✅ [TradingView SSR] Data fetched successfully:', {
      symbol,
      timeframe,
      dataLength: response.data?.length || 0
    });
    
    return {
      initialData: response.data || [],
      ssrSymbol: symbol,
      ssrTimeframe: timeframe as any
    };
    
  } catch (error) {
    console.error('❌ [TradingView SSR] Error fetching data:', error);
    
    // Return empty data on error to prevent SSR failure
    return {
      initialData: [],
      ssrSymbol: symbol,
      ssrTimeframe: timeframe as any
    };
  }
}

/**
 * Generate TradingView widget props for SSR
 * This is a helper function to create consistent SSR props
 */
export function generateTradingViewSSRProps(
  symbol: string = 'EURUSD',
  timeframe: string = '1h',
  days: number = 1
): TradingViewSSRProps {
  return {
    symbol,
    timeframe,
    days
  };
}
