"use client";

import React, { useState, useEffect, useRef } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import widgetDataWebSocket from '@/utils/widgetWebSocket';
import { clearCurrencyStrengthCache } from '../Currency Strength/api';

interface Props { 
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "GBP", name: "British Pound" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
];

interface CurrencyData {
  code: string;
  name: string;
  value: number;
  barCount: number;
  isPositive: boolean;
  blinkingBar: number | null;
}

interface CurrencyStrengthResponse {
  cslabel: Array<{ label: string; showLabel: string }>;
  [currency: string]: Array<{ value: string }> | Array<{ label: string; showLabel: string }>;
}

export function CurrencyStrengthMeterWidget({ 
  onRemove,
  onSettings,
  onFullscreen
}: Props) {
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>(() => 
    CURRENCIES.map(currency => ({
      code: currency.code,
      name: currency.name,
      value: 0,
      barCount: 0,
      isPositive: true,
      blinkingBar: null,
    }))
  );
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const prevValuesRef = useRef<number[]>(new Array(CURRENCIES.length).fill(0));
  const flashTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const lastFetchTimeRef = useRef<number>(0);
  const fetchCountRef = useRef<number>(0);
  const wsConnectedRef = useRef<boolean>(false);

  // Calculate bar counts using relative scaling across all currencies
  const calculateBarCounts = (currencies: CurrencyData[]): CurrencyData[] => {
    const barsPerDirection = 12; // Max bars per direction (12 bars for positive, 12 for negative)
    
    // Find max positive and max negative values
    let maxPositive = 0;
    let maxNegative = 0;
    
    currencies.forEach(currency => {
      if (currency.value > 0) {
        maxPositive = Math.max(maxPositive, currency.value);
      } else {
        maxNegative = Math.min(maxNegative, currency.value);
      }
    });
    
    // Enforce minimum scale
    maxPositive = Math.max(maxPositive, 30);
    maxNegative = Math.min(maxNegative, -30);
    
    // Round to nearest 10
    const positiveScale = Math.ceil(maxPositive / 10) * 10;
    const negativeScale = Math.floor(maxNegative / 10) * 10;
    
    // Calculate bar count for each currency
    return currencies.map(currency => {
      const { value } = currency;
      let activeCount = 0;
      const isPositive = value >= 0;
      
      if (isPositive && value > 0) {
        const strengthRatio = value / positiveScale;
        activeCount = Math.min(Math.round(strengthRatio * barsPerDirection), barsPerDirection);
        if (activeCount === 0) activeCount = 1; // Ensure at least 1 bar for non-zero positive
      } else if (!isPositive && value < 0) {
        const strengthRatio = Math.abs(value) / Math.abs(negativeScale);
        activeCount = Math.min(Math.round(strengthRatio * barsPerDirection), barsPerDirection);
        if (activeCount === 0) activeCount = 1; // Ensure at least 1 bar for non-zero negative
      }
      
      return {
        ...currency,
        barCount: activeCount,
      };
    });
  };

  // Fetch currency strength data
  const fetchCurrencyStrength = async (source: 'polling' | 'websocket' | 'initial' = 'polling') => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    fetchCountRef.current += 1;
    
    console.log(`📊 [CurrencyStrengthMeter] Fetch #${fetchCountRef.current} triggered by ${source}`, {
      timeSinceLastFetch: `${timeSinceLastFetch}ms`,
      lastFetchTime: new Date(lastFetchTimeRef.current).toISOString(),
      currentTime: new Date(now).toISOString(),
      wsConnected: wsConnectedRef.current,
    });

    // Debounce for polling (2 seconds) and websocket (500ms to avoid rapid duplicate updates)
    // Skip debounce for initial load
    if (source !== 'initial') {
      const debounceTime = source === 'polling' ? 2000 : 500;
      if (timeSinceLastFetch < debounceTime) {
        console.log(`⚠️ [CurrencyStrengthMeter] Skipping ${source} fetch - too soon (${timeSinceLastFetch}ms < ${debounceTime}ms)`);
        return;
      }
    }

    // Update timestamp AFTER debounce check, BEFORE fetch
    lastFetchTimeRef.current = now;

    try {
      setConnectionStatus('connecting');
      
      // Clear server-side cache for WebSocket and initial load to ensure fresh data
      if (source === 'websocket' || source === 'initial') {
        try {
          await clearCurrencyStrengthCache('today');
          console.log(`✅ [CurrencyStrengthMeter] Server cache cleared for ${source} fetch`);
        } catch (cacheError) {
          console.warn(`⚠️ [CurrencyStrengthMeter] Cache clear failed (continuing anyway):`, cacheError);
        }
      }
      
      // Add cache bypass header for WebSocket-triggered and initial load to ensure fresh data
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
      };
      if (source === 'websocket' || source === 'initial') {
        headers['x-bypass-cache'] = 'true';
      }
      
      const response = await fetch('/api/heatmaps/currency-strength', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          symbol: 'EURUSD',
          timeframe: 'today'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch currency strength data');
      }

      const result = await response.json();
      const data: CurrencyStrengthResponse = result.data;

      console.log(`📊 [CurrencyStrengthMeter] API response received (${source}):`, {
        timestamp: result.timestamp,
        hasData: !!data,
        currencies: Object.keys(data || {}).filter(k => k !== 'cslabel'),
        responseTime: `${Date.now() - now}ms`
      });

      // Extract latest values for each currency
      setCurrencyData(prevData => {
        const valueChanges: Record<string, { old: number; new: number }> = {};
        
        // First, extract the values
        const updatedCurrencies = prevData.map((currency) => {
          const currencyArray = data[currency.code] as Array<{ value: string }> | undefined;
          
          if (!currencyArray || currencyArray.length === 0) {
            // If no data, keep current state
            return currency;
          }

          // Get the latest value (last element in array)
          const latestValueStr = currencyArray[currencyArray.length - 1]?.value;
          const newValue = latestValueStr ? parseFloat(latestValueStr) : 0;
          const oldValue = currency.value;
          const isPositive = newValue >= 0;
          
          // Track value changes for debugging
          if (Math.abs(newValue - oldValue) > 0.01) {
            valueChanges[currency.code] = { old: oldValue, new: newValue };
          }
          
          return {
            ...currency,
            value: newValue,
            isPositive,
          };
        });
        
        // Log value changes
        if (Object.keys(valueChanges).length > 0) {
          console.log(`📊 [CurrencyStrengthMeter] Value changes detected:`, valueChanges);
        } else {
          console.log(`📊 [CurrencyStrengthMeter] No significant value changes (all values within 0.01)`);
        }
        
        // Calculate bar counts using relative scaling
        const currenciesWithBars = calculateBarCounts(updatedCurrencies);
        
        // Add blinking effect for updated bars
        return currenciesWithBars.map(currency => ({
          ...currency,
          blinkingBar: currency.barCount > 0 ? currency.barCount - 1 : null,
        }));
      });
      
      // Clear flash after animation
      setTimeout(() => {
        setCurrencyData(currentData => 
          currentData.map(c => ({ ...c, blinkingBar: null }))
        );
      }, 400);

      setConnectionStatus('connected');
    } catch (error) {
      console.error(`❌ [CurrencyStrengthMeter] Fetch error (${source}):`, error);
      setConnectionStatus('error');
    }
  };

  // Setup polling and WebSocket listeners
  useEffect(() => {
    // CRITICAL: Only setup on client-side
    if (typeof window === 'undefined') {
      return;
    }

    // Initial fetch
    fetchCurrencyStrength('initial');

    // Setup WebSocket listener for real-time updates
    const handleWebSocketUpdate = (widgetName: string) => {
      console.log(`🔔 [CurrencyStrengthMeter] WebSocket notification received:`, widgetName);
      
      // Check if this is a currency strength update for 'today' timeframe
      // The WebSocket sends 'CurrencyStrengthtoday' for today's data
      const isCurrencyUpdate = widgetName === 'CurrencyStrengthtoday';
      
      if (isCurrencyUpdate) {
        console.log(`✅ [CurrencyStrengthMeter] Currency Strength 'today' update detected, fetching new data...`);
        fetchCurrencyStrength('websocket');
      }
    };

    // Listen to WebSocket updates
    widgetDataWebSocket.onWidgetUpdate(handleWebSocketUpdate);

    // Set up connection status listener
    widgetDataWebSocket.onConnectionStatus((status) => {
      console.log(`🔗 [CurrencyStrengthMeter] WebSocket status:`, status);
      wsConnectedRef.current = status === 'connected';
      if (status === 'connected') {
        setConnectionStatus('connected');
      }
    });

    // Ensure WebSocket is connected
    widgetDataWebSocket.connect().catch(err => {
      console.error('❌ [CurrencyStrengthMeter] WebSocket connection error:', err);
    });

    // Fallback polling every 10 seconds (increased from 5s to reduce load, WebSocket should handle real-time)
    const interval = setInterval(() => {
      // Only poll if WebSocket is not connected
      if (!wsConnectedRef.current) {
        console.log(`⏱️ [CurrencyStrengthMeter] WebSocket not connected, using polling fallback`);
        fetchCurrencyStrength('polling');
      } else {
        console.log(`✅ [CurrencyStrengthMeter] WebSocket connected, skipping polling`);
      }
    }, 10000); // Changed to 10 seconds as fallback

    return () => {
      clearInterval(interval);
      Object.values(flashTimeoutRef.current).forEach(clearTimeout);
      // Note: WebSocket cleanup is handled by the singleton
    };
  }, []);

  // Render bars for each currency
  const renderBars = (currencyInfo: CurrencyData) => {
    const maxBars = 12; // 12 segments for each direction
    const { barCount, isPositive, blinkingBar } = currencyInfo;

    // Create bars array
    const bars = [];
    for (let i = 0; i < maxBars; i++) {
      const isActive = i < barCount;
      const isBlinking = blinkingBar === i;
      const barIntensity = isActive ? Math.max(0.4, 1 - (i / maxBars) * 0.4) : 0.15;
      
      bars.push(
        <div
          key={i}
          className={`flex-1 border-b min-h-0 ${
            isActive
              ? isPositive
                ? 'border-success/30 shadow-sm'
                : 'border-destructive/30 shadow-sm'
              : 'border-border/40'
          } transition-all duration-300`}
          style={{
            backgroundColor: isActive
              ? isPositive
                ? `rgba(34, 197, 94, ${barIntensity})`
                : `rgba(239, 68, 68, ${barIntensity})`
              : '#000000',
            animation: isBlinking ? 'pulse 0.6s' : 'none',
          }}
        />
      );
    }

    return (
      <div className="flex flex-col h-full gap-[1px]">
        {/* Positive bars (top) - reverse order so they build upward */}
        <div className="flex-1 flex flex-col-reverse gap-[1px] min-h-0">
          {isPositive ? bars : Array.from({ length: maxBars }).map((_, i) => (
            <div
              key={`empty-pos-${i}`}
              className="flex-1 border-b border-border/40 min-h-0"
                style={{ backgroundColor: '#000000' }}
            />
          ))}
        </div>
        
        {/* Middle zero line with glow */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent flex-shrink-0 shadow-sm" />
        
        {/* Negative bars (bottom) */}
        <div className="flex-1 flex flex-col gap-[1px] min-h-0">
          {!isPositive ? bars : Array.from({ length: maxBars }).map((_, i) => (
            <div
              key={`empty-neg-${i}`}
              className="flex-1 border-b border-border/40 min-h-0"
                style={{ backgroundColor: '#000000' }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-none overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <WidgetHeader
        title="Currency Strength Meter"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Displays real-time strength indicators for major currencies. Green bars indicate strengthening currencies, red bars indicate weakening currencies. Values represent relative strength compared to baseline."
      >
        {/* WebSocket Connection Status Indicator */}
        <div className="flex items-center gap-1 mr-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
              connectionStatus === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
            title={`Connection: ${connectionStatus}`}
          />
          {connectionStatus === 'connected' && (
            <span className="text-xs text-green-500 hidden sm:inline">Live</span>
          )}
        </div>
      </WidgetHeader>

      <div className="flex-1 px-4 py-3 overflow-auto custom-scrollbar" style={{ backgroundColor: '#000000' }}>
        {/* Currency Grid */}
        <div className="grid grid-cols-8 gap-2 h-full min-h-0">
          {currencyData.map((currency) => {
            const { code, value, isPositive } = currency;
            const absValue = Math.abs(value);
            
            return (
              <div key={code} className="flex flex-col items-center min-h-0 h-full group/column">
                {/* Currency Label - compact header */}
                <div className="flex flex-col items-center mb-2 flex-shrink-0">
                  <div className="text-foreground tracking-wider uppercase font-bold transition-colors duration-500 ease-out group-hover/column:text-foreground/90" style={{fontSize: '13px'}}>
                    {code}
                  </div>
                </div>

                {/* Bar Container - takes all available space */}
                <div className="flex-1 w-full border border-border/60 rounded-sm overflow-hidden shadow-inner backdrop-blur-sm min-h-0 relative transition-all duration-500 ease-out group-hover/column:border-muted-foreground/30 group-hover/column:shadow-md group-hover/column:shadow-muted/20" style={{ backgroundColor: '#000000' }}>
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover/column:opacity-100 transition-opacity duration-300 pointer-events-none ${
                    isPositive 
                      ? 'bg-gradient-to-b from-success/5 via-transparent to-transparent' 
                      : 'bg-gradient-to-t from-destructive/5 via-transparent to-transparent'
                  }`} />
                  
                  <div className="h-full">
                    {renderBars(currency)}
                  </div>
                </div>

                {/* Value with enhanced styling - compact footer */}
                <div className="mt-2 flex flex-col items-center flex-shrink-0">
                  <div className={`tabular-nums font-semibold transition-all duration-300 ${
                    isPositive ? 'text-success' : 'text-destructive'
                  }`} style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: '13px'}}>
                    {isPositive ? '+' : ''}{value.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CurrencyStrengthMeterWidget;

