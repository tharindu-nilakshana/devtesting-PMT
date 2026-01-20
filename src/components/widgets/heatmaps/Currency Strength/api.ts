// Currency Strength API functions and types
// Moved from utils/api.ts to be closer to the heatmaps widgets

import { widgetDataCache } from '@/lib/widgetDataCache';

// Currency Strength Data Types
export interface CurrencyStrengthData {
  cslabel: Array<{ label: number }>;
  [currency: string]: number[] | Array<{ label: number }>;
}

export interface CurrencyStrengthResponse {
  success: boolean;
  data: CurrencyStrengthData;
  timeframe: string;
  currencies: string[];
  timestamp: number;
}

// Cache clearing function
export async function clearCurrencyStrengthCache(timeframe: string): Promise<void> {
  try {
    const res = await fetch('/api/heatmaps/currency-strength/clear-cache', {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'segrW#$@dgnt547@'
      },
      credentials: 'include',
      body: JSON.stringify({ res: timeframe }),
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ [CurrencyStrength] Cache clear failed:', res.status, res.statusText, text);
      throw new Error(`Cache clear failed: ${res.status} ${res.statusText} ${text}`);
    }
    
    await res.json();
  } catch (error) {
    console.error('❌ [CurrencyStrength] Cache clear error:', error);
    throw error;
  }
}

// Simplified API - only the function the widget actually uses
export async function fetchCurrencyStrengthSelected(timeframe: string, selectedCurrencies: string[], symbol: string = 'EURUSD', clearCache: boolean = true) {
  try {
    // Generate cache key for this request
    const cacheKey = widgetDataCache.generateKey('currency-strength', {
      timeframe,
      symbol
    });
    
    // Check global cache first (unless clearCache is explicitly requested)
    if (!clearCache) {
      const cachedData = widgetDataCache.get<CurrencyStrengthResponse>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    // Clear cache first if requested
    if (clearCache) {
      await clearCurrencyStrengthCache(timeframe);
    }
    
    // Add cache bypass header when we need fresh data (WebSocket-triggered refresh)
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json',
    };
    if (clearCache) {
      headers['x-bypass-cache'] = 'true';
    }
    
    const res = await fetch('/api/heatmaps/currency-strength', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ symbol, timeframe }),
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ [CurrencyStrength] API request failed:', res.status, res.statusText, text);
      throw new Error(`API request failed: ${res.status} ${res.statusText} ${text}`);
    }
    
    const data = await res.json();
    
    // Cache the result for future use
    widgetDataCache.set(cacheKey, data);
    
    return data as unknown;
  } catch (error) {
    console.error('❌ [CurrencyStrength] API error:', error);
    throw error; // Re-throw the error instead of fallback
  }
}
