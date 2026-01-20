"use client";

import { useState, useEffect, useRef } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { getSymbolShortFormat } from "@/utils/symbolMapping";
import tradingViewWebSocket from '@/utils/tradingViewWebSocket';
import { ConnectionStatusCallback } from '@/utils/tradingViewWebSocket';
import { widgetDataCache } from '@/lib/widgetDataCache';

interface AverageDailyRangeProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  onSaveSettings?: (settings: Record<string, any>) => void;
  settings?: {
    symbol?: string;
    rangeType?: string; // "D" | "W" | "M" or "daily" | "weekly" | "monthly"
  };
}

interface PeriodData {
  days: number;
  label: string;
  percentage: string;
  pips: number;
}

interface ApiResponse {
  periods: PeriodData[];
  currentPrice: number;
  dayHigh: number;
  dayLow: number;
  summary: {
    sevenDayAvg: string;
    thirtyDayAvg: string;
    annualAvg: string;
  };
}

export function AverageDailyRange({ onSettings, onRemove, onFullscreen, onSaveSettings, settings }: AverageDailyRangeProps) {
  // Initialize rangeType from settings or default to "daily"
  const getInitialRangeType = (): "daily" | "weekly" | "monthly" => {
    const saved = settings?.rangeType as string;
    if (saved === "D" || saved === "daily") return "daily";
    if (saved === "W" || saved === "weekly") return "weekly";
    if (saved === "M" || saved === "monthly") return "monthly";
    return "daily";
  };
  
  const [rangeType, setRangeType] = useState<"daily" | "weekly" | "monthly">(getInitialRangeType());
  const [periods, setPeriods] = useState<PeriodData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [dayHigh, setDayHigh] = useState<number>(0);
  const [dayLow, setDayLow] = useState<number>(0);
  const [summary, setSummary] = useState<{ sevenDayAvg: string; thirtyDayAvg: string; annualAvg: string }>({
    sevenDayAvg: "0.000%",
    thirtyDayAvg: "0.000%",
    annualAvg: "0.000%",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string>(settings?.symbol || "EURUSD");
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  // Track previous symbol for cleanup
  const previousSymbolRef = useRef<string>(symbol);
  // Store average range from API to recalculate dayHigh/dayLow when price updates
  const avgRangeRef = useRef<number>(0);

  // Sync with settings changes (only symbol, period is controlled via D|W|M buttons)
  useEffect(() => {
    if (settings?.symbol && settings.symbol !== symbol) {
      setSymbol(settings.symbol);
    }
  }, [settings?.symbol, symbol]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      const cacheKey = widgetDataCache.generateKey('average-daily-range', { symbol, period: rangeType });
      const cachedData = widgetDataCache.get<ApiResponse>(cacheKey);
      
      if (cachedData) {
        setPeriods(cachedData.periods || []);
        const initialPrice = currentPrice > 0 ? currentPrice : (cachedData.currentPrice || 0);
        setCurrentPrice(initialPrice);
        if (initialPrice > 0) {
          setDayHigh(initialPrice + 0.01);
          setDayLow(initialPrice - 0.01);
        } else {
          setDayHigh(cachedData.dayHigh || 0);
          setDayLow(cachedData.dayLow || 0);
        }
        setSummary(cachedData.summary || {
          sevenDayAvg: "0.000%",
          thirtyDayAvg: "0.000%",
          annualAvg: "0.000%",
        });
        const firstPeriod = cachedData.periods?.[0];
        if (firstPeriod) {
          const percentageValue = parseFloat(firstPeriod.percentage.replace('%', ''));
          avgRangeRef.current = percentageValue || 0;
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/pmt/average-daily-range', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol,
            period: rangeType,
          }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        const apiData: ApiResponse = result.data;
        
        console.log('📊 [AverageDailyRange] Received API data:', {
          periodsCount: apiData.periods?.length || 0,
          currentPrice: apiData.currentPrice,
          dayHigh: apiData.dayHigh,
          dayLow: apiData.dayLow,
          summary: apiData.summary,
        });
        
        // Store average range for recalculating dayHigh/dayLow when price updates
        const firstPeriod = apiData.periods?.[0];
        if (firstPeriod) {
          const percentageValue = parseFloat(firstPeriod.percentage.replace('%', ''));
          avgRangeRef.current = percentageValue || 0;
        }
        
        // Update state with API data
        setPeriods(apiData.periods || []);
        // Use WebSocket price if available, otherwise use API default
        const initialPrice = currentPrice > 0 ? currentPrice : (apiData.currentPrice || 0);
        setCurrentPrice(initialPrice);
        
        // Recalculate dayHigh/dayLow with fixed ±0.01 range
        if (initialPrice > 0) {
          setDayHigh(initialPrice + 0.01);
          setDayLow(initialPrice - 0.01);
        } else {
          setDayHigh(apiData.dayHigh || 0);
          setDayLow(apiData.dayLow || 0);
        }
        
        setSummary(apiData.summary || {
          sevenDayAvg: "0.000%",
          thirtyDayAvg: "0.000%",
          annualAvg: "0.000%",
        });
        
        widgetDataCache.set(cacheKey, apiData);
        
      } catch (err) {
        console.error('Error fetching average daily range data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, rangeType]);

  // WebSocket connection for real-time price updates
  useEffect(() => {
    // CRITICAL: Only connect WebSocket on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      console.log('🚫 [Average Daily Range] Skipping WebSocket connection during SSR');
      return;
    }

    const handleConnectionStatus: ConnectionStatusCallback = (status) => {
      console.log('🔗 [Average Daily Range] WebSocket status:', status);
      setConnectionStatus(status);
    };

    const handlePriceUpdate = (data: Record<string, unknown>) => {
      try {
        const updateSymbol = String(data.symbol || data.Symbol || data.S || data.s || '').toUpperCase();
        const price = parseFloat(String(
          data.price || data.Price || data.last || data.Last || 
          data.close || data.Close || data.c || 0
        ));
        
        if (!updateSymbol || updateSymbol.length < 6 || isNaN(price) || price <= 0) {
          return;
        }

        // Only update if this is our tracked symbol
        if (updateSymbol !== symbol.toUpperCase()) {
          return;
        }

        console.log('💰 [Average Daily Range] Price update received:', { symbol: updateSymbol, price });

        // Update current price
        setCurrentPrice(price);
        
        // Recalculate dayHigh and dayLow with fixed ±0.01 range
        setDayHigh(price + 0.01);
        setDayLow(price - 0.01);
      } catch (error) {
        console.error('❌ [Average Daily Range] Error processing price update:', error);
      }
    };

    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        console.log('🔗 [Average Daily Range] Setting up WebSocket connection...');
        
        // Register callbacks
        tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);
        tradingViewWebSocket.onConnectionStatus(handleConnectionStatus);

        // Connect
        await tradingViewWebSocket.connect();

        // Unsubscribe from previous symbol if it changed
        const oldSymbol = previousSymbolRef.current;
        if (oldSymbol && oldSymbol !== symbol) {
          console.log('🔄 [Average Daily Range] Unsubscribing from old symbol:', oldSymbol);
          tradingViewWebSocket.unsubscribe([oldSymbol]);
        }

        // Subscribe to current symbol - use a small delay to ensure connection is ready
        setTimeout(() => {
          console.log('📊 [Average Daily Range] Subscribing to symbol:', symbol);
          tradingViewWebSocket.subscribe([symbol]);
          previousSymbolRef.current = symbol;
        }, 500);
      } catch (error) {
        console.error('❌ [Average Daily Range] WebSocket connection failed:', error);
        setConnectionStatus('error');
        // Don't throw - allow widget to function without WebSocket
      }
    };

    connectWebSocket();

    // Cleanup on unmount or symbol change
    return () => {
      console.log('🧹 [Average Daily Range] Cleaning up WebSocket...');
      const currentSymbol = previousSymbolRef.current;
      if (currentSymbol) {
        tradingViewWebSocket.unsubscribe([currentSymbol]);
      }
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.removeConnectionStatusCallback(handleConnectionStatus);
      // Don't disconnect - other widgets might be using it
    };
  }, [symbol]);

  // Recalculate pips when currentPrice changes (from WebSocket updates)
  useEffect(() => {
    if (currentPrice > 0 && periods.length > 0) {
      const pipValue = 0.0001;
      setPeriods(prevPeriods => {
        // Only update if pips would actually change
        const updatedPeriods = prevPeriods.map(period => {
          const percentageValue = parseFloat(period.percentage.replace('%', ''));
          const newPips = (percentageValue / 100) * currentPrice / pipValue;
          const roundedPips = Math.round(newPips * 10) / 10;
          // Only update if pips changed
          if (Math.abs(period.pips - roundedPips) > 0.01) {
            return {
              ...period,
              pips: roundedPips,
            };
          }
          return period;
        });
        // Only update state if something actually changed
        const hasChanges = updatedPeriods.some((p, i) => p.pips !== prevPeriods[i].pips);
        return hasChanges ? updatedPeriods : prevPeriods;
      });
    }
  }, [currentPrice]);

  // Calculate position within range (0 to 100)
  const rangePosition = dayHigh > dayLow && currentPrice > 0
    ? ((currentPrice - dayLow) / (dayHigh - dayLow)) * 100
    : 50; // Default to middle if invalid range

  return (
    <div className="h-full w-full flex flex-col bg-widget border border-border rounded-sm overflow-hidden">
      <WidgetHeader
        title={`Average ${rangeType === "daily" ? "Daily" : rangeType === "weekly" ? "Weekly" : "Monthly"} Range`}
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Displays average price ranges for different time periods with current price position indicator."
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
            title={`WebSocket: ${connectionStatus}`}
          />
          {connectionStatus === 'connected' && (
            <span className="text-xs text-green-500 hidden sm:inline">Live</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-400 font-semibold">{getSymbolShortFormat(symbol)}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setRangeType("daily");
                if (onSaveSettings) {
                  onSaveSettings({ rangeType: "daily" });
                }
              }}
              className={`text-xs tracking-wide transition-all ${
                rangeType === "daily"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              D
            </button>
            <span className="text-xs text-border">|</span>
            <button
              onClick={() => {
                setRangeType("weekly");
                if (onSaveSettings) {
                  onSaveSettings({ rangeType: "weekly" });
                }
              }}
              className={`text-xs tracking-wide transition-all ${
                rangeType === "weekly"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              W
            </button>
            <span className="text-xs text-border">|</span>
            <button
              onClick={() => {
                setRangeType("monthly");
                if (onSaveSettings) {
                  onSaveSettings({ rangeType: "monthly" });
                }
              }}
              className={`text-xs tracking-wide transition-all ${
                rangeType === "monthly"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              M
            </button>
          </div>
        </div>
      </WidgetHeader>

      {/* Current Range Visualization */}
      {loading ? (
        <div className="border-b border-border/50 bg-background/30 px-3 py-3 flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : error ? (
        <div className="border-b border-border/50 bg-background/30 px-3 py-3 flex items-center justify-center">
          <span className="text-sm text-red-400">Error: {error}</span>
        </div>
      ) : (
        <div className="border-b border-border/50 bg-background/30 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">Day Low</span>
              <span className="text-base text-red-400 tabular-nums">
                {dayLow > 0 ? dayLow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">Current</span>
              <span className="text-lg text-foreground tabular-nums">
                {currentPrice > 0 ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">Day High</span>
              <span className="text-base text-green-400 tabular-nums">
                {dayHigh > 0 ? dayHigh.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </span>
            </div>
          </div>
          
          {/* Range Bar */}
          {dayHigh > dayLow && currentPrice > 0 && (
            <>
              <div className="relative h-8 bg-background rounded border border-border/50">
                {/* Background gradient */}
                <div 
                  className="absolute inset-0 rounded overflow-hidden"
                  style={{
                    background: 'linear-gradient(to right, rgba(239, 68, 68, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)'
                  }}
                />
                
                {/* Current position indicator */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-primary transition-all duration-300"
                  style={{ left: `${rangePosition}%` }}
                >
                  {/* Top triangle */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-primary" />
                  {/* Bottom triangle */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-primary" />
                </div>
                
                {/* Price labels on the bar */}
                <div className="absolute inset-0 flex items-center justify-between px-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dayLow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {dayHigh.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              {/* Range percentage */}
              <div className="mt-2 text-center">
                <span className="text-sm text-muted-foreground uppercase tracking-wide">
                  {rangeType === "daily" ? "Today's" : rangeType === "weekly" ? "This Week's" : "This Month's"} Range:{" "}
                </span>
                <span className="text-base text-primary tabular-nums font-medium">
                  {dayLow > 0 ? (((dayHigh - dayLow) / dayLow) * 100).toFixed(3) : '0.000'}%
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading table data...</span>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-red-400">Error loading table: {error}</span>
          </div>
        ) : periods.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground">No data available</span>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-widget-header border-b border-border/50">
              <tr>
                <th className="text-left px-2.5 py-1.5">
                  <span className="text-sm text-muted-foreground uppercase tracking-wide">Period</span>
                </th>
                <th className="text-center px-2 py-1.5">
                  <span className="text-sm text-muted-foreground uppercase tracking-wide">Days</span>
                </th>
                <th className="text-right px-2 py-1.5">
                  <span className="text-sm text-muted-foreground uppercase tracking-wide">Pips</span>
                </th>
                <th className="text-right px-2.5 py-1.5">
                  <span className="text-sm text-muted-foreground uppercase tracking-wide">Avg Range</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period, index) => (
                <tr 
                  key={index}
                  className="border-b border-border/30 hover:bg-background/50 transition-colors"
                >
                  <td className="px-2.5 py-1.5">
                    <span className="text-base text-foreground">{period.label}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-background/50 border border-border/50">
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {period.days === 0 ? '—' : period.days}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="text-base text-foreground tabular-nums">
                      {period.pips.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5 text-right">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                      <span className="text-base text-primary tabular-nums">
                        {period.percentage}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Footer */}
      <div className="border-t border-border/50 bg-background/30 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground uppercase tracking-wide">7-Day Avg:</span>
            <span className="text-base text-foreground tabular-nums">
              {summary.sevenDayAvg}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground uppercase tracking-wide">30-Day Avg:</span>
            <span className="text-base text-foreground tabular-nums">
              {summary.thirtyDayAvg}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground uppercase tracking-wide">Annual Avg:</span>
            <span className="text-base text-primary tabular-nums">
              {summary.annualAvg}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AverageDailyRange;

