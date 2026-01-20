// TradingView Widget API functions and types

import { widgetDataCache } from '@/lib/widgetDataCache';

export interface CandleData {
  intervals: number;
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface TradingViewResponse {
  success: boolean;
  data: CandleData[];
  symbol: string;
  timeframe: string;
  from: number;
  to: number;
  timestamp: number;
}

// Cache clearing function
export async function clearTradingViewCache(symbol: string, timeframe: string): Promise<void> {
  try {
    console.log('🗑️ [TradingView] Starting cache clear for symbol:', symbol, 'timeframe:', timeframe);
    
    const res = await fetch('/api/pmt/cleanIQFeedCache', {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'segrW#$@dgnt547@'
      },
      credentials: 'include',
      body: JSON.stringify({ 
        sym: symbol,
        res: timeframe 
      }),
    });
    
    console.log('🗑️ [TradingView] Cache clear API response:', res.status, res.statusText);
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ [TradingView] Cache clear failed:', res.status, res.statusText, text);
      throw new Error(`Cache clear failed: ${res.status} ${res.statusText} ${text}`);
    }
    
    const responseData = await res.json();
    console.log('✅ [TradingView] Cache cleared successfully for symbol:', symbol, 'timeframe:', timeframe, responseData);
  } catch (error) {
    console.error('❌ [TradingView] Cache clear error:', error);
    throw error;
  }
}

// Fetch historical data for TradingView chart
export async function fetchTradingViewData(
  symbol: string, 
  timeframe: string, 
  from: number, 
  to: number, 
  clearCache: boolean = true
): Promise<TradingViewResponse> {
  try {
    // Generate cache key for this request
    // Note: We use a simplified key without from/to since historical data doesn't change frequently
    // and we want to reuse cache when switching tabs/templates
    const cacheKey = widgetDataCache.generateKey('tradingview-chart', {
      symbol,
      timeframe
    });
    
    // Check global cache first (unless clearCache is explicitly requested)
    if (!clearCache) {
      const cachedData = widgetDataCache.get<TradingViewResponse>(cacheKey);
      if (cachedData) {
        console.log('📦 [TradingView] Using cached data, skipping API call');
        return cachedData;
      }
    }
    
    // Clear cache first if requested
    if (clearCache) {
      console.log('🗑️ [TradingView] Clearing cache before fetching data');
      await clearTradingViewCache(symbol, timeframe);
    }

    const requestBody = { 
      sym: symbol, 
      res: timeframe, 
      frm: from.toString(), 
      to: to.toString() 
    };
    
    console.log('📊 [TradingView] Frontend API request:', {
      url: '/api/pmt/getIQFeedHistoricalData',
      requestBody,
      cacheCleared: clearCache
    });
    
    const res = await fetch('/api/pmt/getIQFeedHistoricalData', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'segrW#$@dgnt547@'
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ [TradingView] API request failed:', res.status, res.statusText, text);
      
      if (res.status === 401) {
        throw new Error('Authentication required');
      } else if (res.status >= 500) {
        throw new Error('Server error');
      } else {
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }
    }
    
    const data = await res.json();
    console.log('✅ [TradingView] API response:', data);
    
    // Debug: Check raw data structure
    if (Array.isArray(data) && data.length > 0) {
      console.log('📊 [TradingView] Raw data sample:', data.slice(0, 2));
    } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data) && data.data.length > 0) {
      console.log('📊 [TradingView] Wrapped data sample:', data.data.slice(0, 2));
    }
    
    // Handle both direct array responses and wrapped response objects
    let chartData: CandleData[] = [];
    
    if (Array.isArray(data)) {
      // Direct array response
      chartData = data;
    } else if (data && typeof data === 'object' && 'data' in data) {
      // Wrapped response object
      chartData = Array.isArray(data.data) ? data.data : [];
    } else {
      console.warn('⚠️ [TradingView] Unexpected API response format:', data);
      chartData = [];
    }
    
    // Ensure we return the data in the expected format
    const response: TradingViewResponse = {
      success: true,
      data: chartData,
      symbol,
      timeframe,
      from,
      to,
      timestamp: Date.now()
    };
    
    console.log('📊 [TradingView] Formatted response:', {
      success: response.success,
      dataLength: response.data.length,
      symbol: response.symbol,
      timeframe: response.timeframe
    });
    
    // Cache the result for future use
    widgetDataCache.set(cacheKey, response);
    
    return response;
  } catch (error) {
    console.error('❌ [TradingView] API error:', error);
    throw error;
  }
}

// Helper function to get Unix timestamp for days ago
export function getUnixForDaysAgo(days: number): number {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return Math.floor(now.getTime() / 1000) - days * 24 * 60 * 60;
}

// Helper function to get current Unix timestamp
export function getCurrentUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

// Available symbols for TradingView
export const AVAILABLE_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
  'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
  'EURGBP', 'EURAUD', 'EURCAD', 'EURCHF', 'EURNZD',
  'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD',
  'AUDCAD', 'AUDCHF', 'AUDNZD',
  'CADCHF', 'CADNZD', 'CHFNZD'
];

// Available timeframes for TradingView
export const AVAILABLE_TIMEFRAMES = [
  { label: '1m', value: '1m' },      // 1 minute
  { label: '5m', value: '5m' },      // 5 minutes
  { label: '15m', value: '15m' },    // 15 minutes
  { label: '30m', value: '30m' },    // 30 minutes
  { label: '1h', value: '1h' },      // 1 hour
  { label: '4h', value: '4h' },      // 4 hours
  { label: '1d', value: '1d' },      // 1 day
  { label: '1w', value: '1w' },      // 1 week
  { label: '1mo', value: '1M' }      // 1 month (using 'mo' to distinguish from minute)
];
