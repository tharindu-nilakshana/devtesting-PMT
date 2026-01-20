"use client";

import { useState, useEffect, useRef } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { fetchFxVolatilityLevelsBySymbol, type VolatilityLevel } from "./api";
import { createChart, type IChartApi, type ISeriesApi, type Time, type CandlestickData } from 'lightweight-charts';
import { getSymbolShortFormat } from "@/utils/symbolMapping";

interface FXVolatilityLevelsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    symbol?: string;
    periodType?: "Daily" | "Weekly" | "Monthly";
  };
}

interface CandleData {
  time: number; // Unix timestamp for lightweight-charts
  open: number;
  high: number;
  low: number;
  close: number;
}

const AVAILABLE_SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD",
  "AUDCAD", "AUDCHF", "AUDJPY", "AUDNZD", "CADCHF", "CADJPY",
  "EURGBP", "EURJPY", "EURCHF", "GBPJPY", "GBPCHF", "NZDUSD",
];

interface ApiCandleData {
  time?: string;
  datetime?: string;
  open?: string | number;
  high?: string | number;
  low?: string | number;
  close?: string | number;
  Open?: string | number;
  High?: string | number;
  Low?: string | number;
  Close?: string | number;
}

export function FXVolatilityLevels({ onSettings, onRemove, onFullscreen, settings }: FXVolatilityLevelsProps) {
  const [periodType, setPeriodType] = useState<"Daily" | "Weekly" | "Monthly">(settings?.periodType || "Daily");
  const [selectedSymbol, setSelectedSymbol] = useState<string>(settings?.symbol || "GBPUSD");
  const [volatilityDataArray, setVolatilityDataArray] = useState<VolatilityLevel[]>([]);
  const [candlestickData, setCandlestickData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const upperLevelSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowerLevelSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Sync with settings changes (only symbol, periodType is controlled from header)
  useEffect(() => {
    if (settings?.symbol && settings.symbol !== selectedSymbol) {
      setSelectedSymbol(settings.symbol);
    }
  }, [settings]);

  // Fetch volatility levels and historical price data when symbol or periodType changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch volatility levels first
        const levels = await fetchFxVolatilityLevelsBySymbol(selectedSymbol, 100, 0);
        if (levels && levels.length > 0) {
          setVolatilityDataArray(levels);
        } else {
          setError(null); // Clear error state
          setVolatilityDataArray([]); // Set empty array
          setLoading(false);
          return; // Continue to show empty state instead of error
        }

        // Get the latest volatility level (for reference, but we'll fetch last 30 candles)
        const latestLevel = levels[0];
        if (!latestLevel || !latestLevel.datetime) {
          setError(`Invalid volatility data for ${selectedSymbol}`);
          setLoading(false);
          return;
        }

        // Resolution mapping: "240" (4 hour), "1D" (daily), "1W" (weekly), "1M" (Monthly)
        const resolution = periodType === "Daily" ? "240" : "1D";
        
        // Calculate time range to fetch enough data to get the target number of candles
        // We'll fetch more than needed to ensure we have enough candles, then take the last N candles
        const toTimestamp = Math.floor(Date.now() / 1000);
        
        // Calculate days to go back based on period type to ensure we get enough candles
        // Daily: 30 candles * 4 hours = 120 hours = 5 days (use 20 days buffer to account for weekends/holidays)
        // Weekly: 30 candles * 1 day = 30 trading days (use 90 days buffer ≈ 64 trading days)
        // Monthly: 60 candles * 1 day = 60 trading days (use 120 days buffer ≈ 85 trading days for more historical context)
        // Since markets are closed on weekends: 30 trading days ≈ 6 weeks ≈ 42 calendar days
        // We need extra buffer for holidays and API limits
        const daysAgo = periodType === "Daily" 
          ? 20 
          : periodType === "Weekly" 
            ? 90 
            : 120; // Monthly
        const fromTimestamp = toTimestamp - (daysAgo * 24 * 60 * 60);
        
        // Determine target candle count based on period type
        // Daily: 30 candles, Weekly: 30 candles, Monthly: 60 candles (more historical context)
        const targetCandleCount = periodType === "Monthly" ? 60 : 30;
        
        console.log('📊 [FX Volatility Levels] Fetching candles:', {
          symbol: selectedSymbol,
          periodType,
          resolution,
          from: new Date(fromTimestamp * 1000).toISOString(),
          to: new Date(toTimestamp * 1000).toISOString(),
          fromTimestamp,
          toTimestamp,
          daysAgo,
          targetCandles: targetCandleCount
        });
        
        const candleResponse = await fetch('/api/pmt/getIQFeedHistoricalData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            sym: selectedSymbol,
            res: resolution,
            frm: fromTimestamp.toString(),
            to: toTimestamp.toString(),
          }),
        });

        if (!candleResponse.ok) {
          throw new Error(`Failed to fetch candlestick data: ${candleResponse.statusText}`);
        }

        const candleResult = await candleResponse.json();
        const rawCandleData: ApiCandleData[] = Array.isArray(candleResult) ? candleResult : (candleResult?.data || []);
        
        console.log('📊 [FX Volatility Levels] Received candle data:', {
          rawCount: rawCandleData.length,
          periodType,
          resolution,
          from: new Date(fromTimestamp * 1000).toISOString(),
          to: new Date(toTimestamp * 1000).toISOString()
        });
        
        if (rawCandleData.length === 0) {
          console.warn('⚠️ [FX Volatility Levels] No candlestick data received');
          setCandlestickData([]);
        } else {
          // Take the last N candles based on period type (targetCandleCount defined above)
          // Daily: 30, Weekly: 30, Monthly: 60 (or all if we have fewer)
          const candlesToUse = rawCandleData.length >= targetCandleCount 
            ? rawCandleData.slice(-targetCandleCount)
            : rawCandleData;
          
          console.log('📊 [FX Volatility Levels] Using candles:', {
            originalCount: rawCandleData.length,
            usingCount: candlesToUse.length,
            targetCount: targetCandleCount,
            hasEnough: rawCandleData.length >= targetCandleCount
          });
          
          // Transform API data to CandleData format for lightweight-charts
          const transformedCandles: CandleData[] = candlesToUse.map((candle: ApiCandleData, index: number) => {
            const open = parseFloat(String(candle.open || candle.Open || '0'));
            const high = parseFloat(String(candle.high || candle.High || '0'));
            const low = parseFloat(String(candle.low || candle.Low || '0'));
            const close = parseFloat(String(candle.close || candle.Close || '0'));
            
            // Convert time to Unix timestamp
            // Try to parse datetime string first
            let time: number;
            const datetimeStr = candle.datetime || candle.time;
            if (datetimeStr && typeof datetimeStr === 'string') {
              // Try to parse various datetime formats
              const date = new Date(datetimeStr.replace(' ', 'T'));
              if (!isNaN(date.getTime())) {
                time = Math.floor(date.getTime() / 1000);
              } else {
                // Fallback: calculate time from last candle backwards
                // Since we're taking the last 30 candles, we need to calculate from the end
                const resolutionSeconds = periodType === "Daily" ? 14400 : 86400;
                // Calculate from the end: last candle is at toTimestamp, work backwards
                const reverseIndex = candlesToUse.length - 1 - index;
                time = toTimestamp - (reverseIndex * resolutionSeconds);
              }
            } else {
              // Calculate time from last candle backwards
              // Since we're taking the last 30 candles, we need to calculate from the end
              const resolutionSeconds = periodType === "Daily" ? 14400 : 86400;
              // Calculate from the end: last candle is at toTimestamp, work backwards
              const reverseIndex = candlesToUse.length - 1 - index;
              time = toTimestamp - (reverseIndex * resolutionSeconds);
            }

            return {
              time,
              open,
              high,
              low,
              close,
            };
          }).filter(c => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 && c.time > 0); // Filter invalid data

          // Sort by time ascending (required by lightweight-charts)
          transformedCandles.sort((a, b) => a.time - b.time);
          
          console.log('📊 [FX Volatility Levels] Transformed candles:', {
            count: transformedCandles.length,
            firstTime: transformedCandles[0] ? new Date(transformedCandles[0].time * 1000).toISOString() : 'N/A',
            lastTime: transformedCandles[transformedCandles.length - 1] ? new Date(transformedCandles[transformedCandles.length - 1].time * 1000).toISOString() : 'N/A'
          });
          
          setCandlestickData(transformedCandles);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSymbol, periodType]);

  // Get the most recent data point for volatility level lines
  const latestVolatilityData = volatilityDataArray.length > 0 ? volatilityDataArray[0] : null;

  // Calculate volatility levels based on period type and API data
  const upperLevel = latestVolatilityData 
    ? (periodType === "Daily" ? latestVolatilityData.dailyHigh 
       : periodType === "Weekly" ? latestVolatilityData.weeklyHigh 
       : latestVolatilityData.monthlyHigh)
    : undefined;
  
  const lowerLevel = latestVolatilityData 
    ? (periodType === "Daily" ? latestVolatilityData.dailyLow 
       : periodType === "Weekly" ? latestVolatilityData.weeklyLow 
       : latestVolatilityData.monthlyLow)
    : undefined;

  // Candlestick data is now fetched from historical price API - no transformation needed

  // Check if we have valid data
  const hasValidData = upperLevel !== undefined && lowerLevel !== undefined && upperLevel > lowerLevel && candlestickData.length > 0;
  
  // Initialize chart when container becomes available
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || chartRef.current) return;

    console.log('📊 [FX Volatility Levels] Initializing chart');

    // Create chart
    chartRef.current = createChart(container, {
      layout: {
        background: { color: '#000000' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#0a0a0a' },
        horzLines: { color: '#0a0a0a' },
      },
      rightPriceScale: {
        borderColor: '#374151',
        visible: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        rightOffset: 2,
        fixLeftEdge: true,
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#FFB02E',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: '#FFB02E',
          style: 2,
        },
      },
      autoSize: true,
    });

    // Add candlestick series with 4 decimal places
    candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: true,
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    // Add upper level line (green) - volatility high with 4 decimal places, solid 2px
    upperLevelSeriesRef.current = chartRef.current.addLineSeries({
      color: '#22c55e', // Green for high (bullish)
      lineWidth: 2,
      lineStyle: 0, // Solid line (0 = solid, 1 = dashed, 2 = dotted)
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    // Add lower level line (red) - volatility low with 4 decimal places, solid 2px
    lowerLevelSeriesRef.current = chartRef.current.addLineSeries({
      color: '#ef4444', // Red for low (bearish)
      lineWidth: 2,
      lineStyle: 0, // Solid line (0 = solid, 1 = dashed, 2 = dotted)
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    // Handle resize
    resizeObserverRef.current = new ResizeObserver(() => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ 
          width: container.clientWidth, 
          height: container.clientHeight 
        });
      }
    });

    resizeObserverRef.current.observe(container);

    console.log('✅ [FX Volatility Levels] Chart initialized');

    // Cleanup on unmount
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (chartRef.current) {
        console.log('🧹 [FX Volatility Levels] Cleaning up chart');
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        upperLevelSeriesRef.current = null;
        lowerLevelSeriesRef.current = null;
      }
    };
  }, [loading]); // Re-run when loading changes to ensure container is available

  // Update chart data when candlestick data or volatility levels change
  useEffect(() => {
    if (!hasValidData || !chartRef.current || !candlestickSeriesRef.current || !upperLevelSeriesRef.current || !lowerLevelSeriesRef.current) {
      return;
    }

    // Update candlestick data
    const chartData: CandlestickData[] = candlestickData.map(candle => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candlestickSeriesRef.current.setData(chartData);

    // Update volatility level lines
    // Create horizontal lines that extend the full chart width
    if (candlestickData.length > 0) {
      const firstTime = candlestickData[0].time;
      const lastTime = candlestickData[candlestickData.length - 1].time;
      
      // Use a very wide time range to ensure lines extend beyond the visible chart area
      // This ensures the lines span the full widget width regardless of zoom/pan
      const now = Math.floor(Date.now() / 1000);
      const wideRange = 86400 * 365; // 1 year range to ensure full coverage
      
      // Calculate extended times - extend far before first candle and far after last candle
      const extendedFirstTime = typeof firstTime === 'number' 
        ? (firstTime - wideRange) as Time
        : (now - wideRange) as Time;
      const extendedLastTime = typeof lastTime === 'number'
        ? (lastTime + wideRange) as Time
        : (now + wideRange) as Time;

      // Upper level (green) - volatility high - dashed line spanning full width
      upperLevelSeriesRef.current.setData([
        { time: extendedFirstTime, value: upperLevel! },
        { time: extendedLastTime, value: upperLevel! },
      ]);

      // Lower level (red) - volatility low - dashed line spanning full width
      lowerLevelSeriesRef.current.setData([
        { time: extendedFirstTime, value: lowerLevel! },
        { time: extendedLastTime, value: lowerLevel! },
      ]);
    }

    // Update time scale based on period type
    const timeScaleOptions: any = {
      rightOffset: 2,
      fixLeftEdge: true,
      borderColor: '#374151',
      timeVisible: true,
      secondsVisible: false,
    };

    // Adjust time scale visibility and formatting based on period type and candle resolution
    if (periodType === "Daily") {
      // For daily (4h candles over 1 day), show hours only (no date repetition)
      timeScaleOptions.hoursVisible = true;
      timeScaleOptions.minutesVisible = false;
      timeScaleOptions.tickMarkFormatter = (time: number, tickMarkType: any, locale: string) => {
        const date = new Date(time * 1000);
        // Show only time for daily view (e.g., "03:00", "07:00", "11:00")
        // The date will be shown once by the chart library
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      };
    } else if (periodType === "Weekly") {
      // For weekly (daily candles over 7 days), show dates with day names
      timeScaleOptions.hoursVisible = false;
      timeScaleOptions.minutesVisible = false;
      timeScaleOptions.tickMarkFormatter = (time: number, tickMarkType: any, locale: string) => {
        const date = new Date(time * 1000);
        // Show day name and date for weekly view (e.g., "Mon 12", "Tue 13")
        const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
        const dayMonth = date.toLocaleDateString(locale, { day: 'numeric' });
        return `${dayName} ${dayMonth}`;
      };
    } else {
      // For monthly (daily candles over 30 days), show dates with month and day
      timeScaleOptions.hoursVisible = false;
      timeScaleOptions.minutesVisible = false;
      timeScaleOptions.tickMarkFormatter = (time: number, tickMarkType: any, locale: string) => {
        const date = new Date(time * 1000);
        // Show month and day for monthly view (e.g., "Dec 12", "Dec 15", "Dec 20")
        return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      };
    }

    chartRef.current.timeScale().applyOptions(timeScaleOptions);

    // Update price scale to auto-fit all data (includes volatility levels and candlesticks)
    // lightweight-charts autoScale automatically includes all series data
    chartRef.current.priceScale('right').applyOptions({
      autoScale: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    });

    // Fit content to show all data
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candlestickData, upperLevel, lowerLevel, hasValidData, periodType]);

  return (
    <div className="w-full h-full bg-widget-body flex flex-col border border-border rounded-none overflow-hidden">
      <WidgetHeader 
        title="FX Volatility Levels"
        subtitle={`[${getSymbolShortFormat(selectedSymbol)}]`}
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      >
        {/* Period Type Segmented Control - D | W | M */}
        <div className="flex items-center gap-2 mr-2">
          <div className="flex bg-background border border-border p-0.5 rounded-none">
            <button
              onClick={() => setPeriodType("Daily")}
              className={`px-3 py-1.5 text-xs font-bold border-none rounded-none cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                periodType === "Daily" 
                  ? 'bg-transparent text-foreground' 
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {periodType === "Daily" && (
                <span className="text-orange-500 text-[10px]">✓</span>
              )}
              D
            </button>
            <button
              onClick={() => setPeriodType("Weekly")}
              className={`px-3 py-1.5 text-xs font-bold border-none rounded-none cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                periodType === "Weekly" 
                  ? 'bg-transparent text-foreground' 
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {periodType === "Weekly" && (
                <span className="text-orange-500 text-[10px]">✓</span>
              )}
              W
            </button>
            <button
              onClick={() => setPeriodType("Monthly")}
              className={`px-3 py-1.5 text-xs font-bold border-none rounded-none cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                periodType === "Monthly" 
                  ? 'bg-transparent text-foreground' 
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {periodType === "Monthly" && (
                <span className="text-orange-500 text-[10px]">✓</span>
              )}
              M
            </button>
          </div>
        </div>
      </WidgetHeader>

      {/* Level Labels */}
      <div className="border-b border-border bg-widget-header px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <span className="text-sm text-muted-foreground">Loading volatility levels...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-2">
            <span className="text-sm text-red-400">Error: {error}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{periodType} LOW:</span>
              <div className="bg-red-500/20 rounded px-2 py-1">
                <span className="text-sm text-red-400 tabular-nums font-medium">
                  {lowerLevel !== undefined ? lowerLevel.toFixed(4) : '---'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{periodType} HIGH:</span>
              <div className="bg-emerald-500/20 rounded px-2 py-1">
                <span className="text-sm text-emerald-400 tabular-nums font-medium">
                  {upperLevel !== undefined ? upperLevel.toFixed(4) : '---'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Loading chart...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-red-400">Error: {error}</span>
          </div>
        ) : !hasValidData && volatilityDataArray.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <span className="text-sm text-muted-foreground block">No volatility data available</span>
              <span className="text-xs text-muted-foreground/70 block">Data may not have been updated recently for {selectedSymbol}</span>
            </div>
          </div>
        ) : (
          <>
            {!hasValidData && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <span className="text-sm text-muted-foreground">No volatility data available</span>
          </div>
            )}
            <div ref={chartContainerRef} className="h-full w-full relative" style={{ position: 'relative' }} />
          </>
        )}
      </div>
    </div>
  );
}

export default FXVolatilityLevels;


