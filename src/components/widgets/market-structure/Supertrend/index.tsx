/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetSettingsSlideIn, type WidgetSettings } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import { createChart, type IChartApi, type ISeriesApi, type Time, ColorType } from "lightweight-charts";
import { fetchTradingViewData, type CandleData } from "@/components/widgets/price-charts/TradingViewWidget/api";
import { useTheme } from "@/hooks/useTheme";
import { useTemplates } from "@/hooks/useTemplates";
import tradingViewWebSocket from "@/utils/tradingViewWebSocket";
import { widgetDataCache } from "@/lib/widgetDataCache";

type Timeframe = "4h" | "1d" | "1w";

// Map timeframes to API format
const timeframeToApiFormat: Record<Timeframe, string> = {
  "4h": "4h",
  "1d": "1d",
  "1w": "1w",
};

// Supertrend calculation parameters
const SUPERTREND_PERIOD = 10;
const SUPERTREND_MULTIPLIER = 3;

interface CandlestickData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface SupertrendPoint {
  time: Time;
  value: number;
  color: string;
}

interface Props {
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  symbol?: string;
  module?: string;
  settings?: WidgetSettings;
}

// Calculate True Range
function calculateTR(high: number, low: number, prevClose: number): number {
  return Math.max(
    high - low,
    Math.abs(high - prevClose),
    Math.abs(low - prevClose)
  );
}

// Calculate ATR (Average True Range) using Simple Moving Average
function calculateATR(candles: CandlestickData[], period: number): number[] {
  const atr: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      atr.push(candles[i].high - candles[i].low);
      continue;
    }
    
    const tr = calculateTR(candles[i].high, candles[i].low, candles[i - 1].close);
    
    if (i < period) {
      // Not enough data for full ATR, use simple average of TR values so far
      const sum = atr.reduce((a, b) => a + b, 0) + tr;
      atr.push(sum / (i + 1));
    } else {
      // EMA-like smoothing for ATR
      const prevATR = atr[i - 1];
      atr.push((prevATR * (period - 1) + tr) / period);
    }
  }
  
  return atr;
}

// Calculate Supertrend indicator
function calculateSupertrend(candles: CandlestickData[], period: number, multiplier: number): SupertrendPoint[] {
  if (candles.length < period) return [];
  
  const atr = calculateATR(candles, period);
  const supertrend: SupertrendPoint[] = [];
  
  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSupertrend = 0;
  let prevDirection = 1; // 1 = bullish (green), -1 = bearish (red)
  
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const hl2 = (candle.high + candle.low) / 2;
    const currentATR = atr[i];
    
    // Calculate basic bands
    let upperBand = hl2 + multiplier * currentATR;
    let lowerBand = hl2 - multiplier * currentATR;
    
    if (i > 0) {
      // Lower band logic
      if (lowerBand > prevLowerBand || candles[i - 1].close < prevLowerBand) {
        // Keep current lowerBand
      } else {
        lowerBand = prevLowerBand;
      }
      
      // Upper band logic
      if (upperBand < prevUpperBand || candles[i - 1].close > prevUpperBand) {
        // Keep current upperBand
      } else {
        upperBand = prevUpperBand;
      }
      
      // Determine direction and supertrend value
      let direction = prevDirection;
      let supertrendValue = prevSupertrend;
      
      if (prevSupertrend === prevUpperBand) {
        // Was bearish
        if (candle.close > upperBand) {
          direction = 1; // Switch to bullish
          supertrendValue = lowerBand;
        } else {
          direction = -1;
          supertrendValue = upperBand;
        }
      } else {
        // Was bullish
        if (candle.close < lowerBand) {
          direction = -1; // Switch to bearish
          supertrendValue = upperBand;
        } else {
          direction = 1;
          supertrendValue = lowerBand;
        }
      }
      
      supertrend.push({
        time: candle.time,
        value: supertrendValue,
        color: direction === 1 ? "#22c55e" : "#ef4444", // Green for bullish, Red for bearish
      });
      
      prevDirection = direction;
      prevSupertrend = supertrendValue;
    } else {
      // First candle - initialize
      prevSupertrend = lowerBand;
      supertrend.push({
        time: candle.time,
        value: lowerBand,
        color: "#22c55e",
      });
    }
    
    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
  }
  
  return supertrend;
}

export default function SupertrendWidget({
  wgid = "supertrend",
  onRemove,
  onFullscreen,
  symbol: propSymbol = "EURUSD",
  module: propModule = "Forex",
  settings: externalSettings,
}: Props) {
  const { isDark } = useTheme();
  const { activeTemplateId, updateWidgetFields } = useTemplates();
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const supertrendSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const hasFetchedRef = useRef<boolean>(false);
  const candleDataRef = useRef<CandlestickData[]>([]);

  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [supertrendValue, setSupertrendValue] = useState<number>(0);

  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => ({
    ...externalSettings,
    module: externalSettings?.module || propModule,
    symbol: externalSettings?.symbol || propSymbol,
    timeframe: externalSettings?.timeframe || "4h",
  }));

  const selectedSymbol = widgetSettings.symbol || propSymbol;
  const selectedTimeframe = (widgetSettings.timeframe as Timeframe) || "4h";

  useEffect(() => {
    if (externalSettings) {
      setWidgetSettings((prev) => ({ ...prev, ...externalSettings }));
    }
  }, [externalSettings]);

  const handleSaveSettings = async (newSettings: WidgetSettings) => {
    setWidgetSettings(newSettings);

    // Save settings to database
    if (wgid && activeTemplateId) {
      try {
        const additionalSettings = JSON.stringify({
          timeframe: newSettings.timeframe || "4h"
        });

        const updateFields: any = {
          additionalSettings,
          module: newSettings.module || "Forex",
          symbols: newSettings.symbol || "EURUSD"
        };

        console.log('📡 [Supertrend] Calling updateWidgetFields API:', {
          widgetId: wgid,
          templateId: activeTemplateId,
          updateFields
        });

        const result = await updateWidgetFields(wgid, activeTemplateId, updateFields);

        if (result.success) {
          console.log('✅ [Supertrend] Settings saved to database');
        } else {
          console.warn('⚠️ [Supertrend] Failed to save settings:', result.message);
        }
      } catch (error) {
        console.error('❌ [Supertrend] Error saving settings to database:', error);
      }
    }
  };

  // Fetch and process data
  const fetchData = useCallback(async () => {
    // Check cache first
    const cacheKey = widgetDataCache.generateKey('supertrend', { symbol: selectedSymbol, timeframe: selectedTimeframe });
    const cachedData = widgetDataCache.get<any>(cacheKey);
    if (cachedData) {
      console.log('✅ [Supertrend] Using cached data');
      candleDataRef.current = cachedData.candles;

      // Update chart data
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(cachedData.candles);
      }

      if (supertrendSeriesRef.current && cachedData.supertrendData.length > 0) {
        supertrendSeriesRef.current.setData(cachedData.supertrendData);
      }

      // Update metrics
      const latestCandle = cachedData.candles[cachedData.candles.length - 1];
      const latestSupertrend = cachedData.supertrendData[cachedData.supertrendData.length - 1];
      setCurrentPrice(latestCandle.close);
      setSupertrendValue(latestSupertrend.value);

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }

      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (hasFetchedRef.current) {
      console.log('🚫 [Supertrend] Skipping duplicate fetch');
      return;
    }
    
    hasFetchedRef.current = true;
    
    try {
      setLoading(true);
      setError(null);

      const now = Math.floor(Date.now() / 1000);
      // Get more data for better Supertrend calculation
      const daysBack = selectedTimeframe === "1w" ? 365 * 2 : selectedTimeframe === "1d" ? 180 : 60;
      const from = now - daysBack * 24 * 60 * 60;

      console.log(`📊 [Supertrend] Fetching data for ${selectedSymbol} ${selectedTimeframe}`);
      
      const response = await fetchTradingViewData(
        selectedSymbol,
        timeframeToApiFormat[selectedTimeframe],
        from,
        now,
        false // Don't clear cache
      );

      if (!response.success || !response.data || response.data.length === 0) {
        throw new Error("No data available");
      }

      // Convert to candlestick format
      const candles: CandlestickData[] = response.data
        .map((d: CandleData) => ({
          time: Math.floor(new Date(d.datetime).getTime() / 1000) as Time,
          open: parseFloat(d.open),
          high: parseFloat(d.high),
          low: parseFloat(d.low),
          close: parseFloat(d.close),
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));

      console.log(`📊 [Supertrend] Received ${candles.length} candles`);

      // Store candles in ref for WebSocket updates
      candleDataRef.current = candles;

      // Calculate Supertrend
      const supertrendData = calculateSupertrend(candles, SUPERTREND_PERIOD, SUPERTREND_MULTIPLIER);

      // Update chart data
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(candles);
      }

      if (supertrendSeriesRef.current && supertrendData.length > 0) {
        // Split supertrend data by color for proper rendering
        // We need to create line segments that maintain their color
        const lineData = supertrendData.map(point => ({
          time: point.time,
          value: point.value,
          color: point.color,
        }));
        
        supertrendSeriesRef.current.setData(lineData);
      }

      // Fit content to show recent data nicely
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
        
        // Scroll to show more recent data with proper zoom
        const visibleBars = Math.min(80, candles.length);
        if (candles.length > visibleBars) {
          const fromTime = candles[candles.length - visibleBars].time;
          const toTime = candles[candles.length - 1].time;
          chartRef.current.timeScale().setVisibleRange({
            from: fromTime,
            to: toTime,
          });
        }
      }

      // Update metrics
      const latestCandle = candles[candles.length - 1];
      const latestSupertrend = supertrendData[supertrendData.length - 1];
      setCurrentPrice(latestCandle.close);
      setSupertrendValue(latestSupertrend.value);

      // Cache the result
      widgetDataCache.set(cacheKey, { candles, supertrendData });

      setLoading(false);
    } catch (err) {
      console.error("❌ [Supertrend] Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      setLoading(false);
    }
  }, [selectedSymbol, selectedTimeframe]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      supertrendSeriesRef.current = null;
    }

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#9ca3af" : "#4b5563",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(31, 41, 55, 0.5)" : "rgba(229, 231, 235, 0.8)" },
        horzLines: { color: isDark ? "rgba(31, 41, 55, 0.5)" : "rgba(229, 231, 235, 0.8)" },
      },
      rightPriceScale: {
        borderColor: isDark ? "#374151" : "#d1d5db",
        scaleMargins: { top: 0.1, bottom: 0.1 },
        visible: true,
      },
      timeScale: {
        borderColor: isDark ? "#374151" : "#d1d5db",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        minBarSpacing: 6,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
          width: 1,
          style: 3,
          labelBackgroundColor: isDark ? "#374151" : "#e5e7eb",
        },
        horzLine: {
          color: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
          width: 1,
          style: 3,
          labelBackgroundColor: isDark ? "#374151" : "#e5e7eb",
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: true,
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "price",
        precision: 5,
        minMove: 0.00001,
      },
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Add Supertrend line series
    const supertrendSeries = chart.addLineSeries({
      color: "#22c55e",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });
    supertrendSeriesRef.current = supertrendSeries;

    // Resize observer
    const resizeChart = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const ro = new ResizeObserver(() => resizeChart());
    ro.observe(chartContainerRef.current);
    resizeObserverRef.current = ro;

    // Initial resize
    resizeChart();

    // Fetch data
    fetchData();

    return () => {
      ro.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        supertrendSeriesRef.current = null;
      }
    };
  }, [isDark]); // Only reinitialize on theme change

  // Refetch data when symbol or timeframe changes
  useEffect(() => {
    if (chartRef.current) {
      // Reset fetch flag when symbol or timeframe changes
      hasFetchedRef.current = false;
      fetchData();
    }
  }, [selectedSymbol, selectedTimeframe]); // Don't include fetchData to prevent infinite loop

  // Listen for TradingView WebSocket price updates
  useEffect(() => {
    const handlePriceUpdate = (payload: any) => {
      try {
        const updateSymbol = String(payload.symbol || payload.Symbol || payload.S || payload.s || '').toUpperCase();
        const price = Number(payload.price ?? payload.Price ?? payload.last ?? payload.Last ?? payload.close ?? payload.Close ?? payload.c);

        if (updateSymbol !== selectedSymbol.toUpperCase() || isNaN(price)) {
          return;
        }

        // Update the last candle in-memory using ref instead of series.data()
        if (candlestickSeriesRef.current && candleDataRef.current.length > 0) {
          const lastCandle = candleDataRef.current[candleDataRef.current.length - 1];
          
          const updatedCandle: CandlestickData = {
            time: lastCandle.time,
            open: lastCandle.open,
            high: Math.max(lastCandle.high, price),
            low: Math.min(lastCandle.low, price),
            close: price,
          };

          // Update the ref
          candleDataRef.current[candleDataRef.current.length - 1] = updatedCandle;
          
          // Update the chart
          candlestickSeriesRef.current.update(updatedCandle);
          console.log('📊 [Supertrend] Real-time price update:', { symbol: updateSymbol, price });
        }
      } catch (error) {
        console.error('📊 [Supertrend] Error handling price update:', error);
      }
    };

    // Connect to WebSocket and subscribe to symbol
    tradingViewWebSocket.connect().then(() => {
      tradingViewWebSocket.subscribe([selectedSymbol]);
      console.log('📊 [Supertrend] Subscribed to WebSocket for:', selectedSymbol);
    }).catch(error => {
      console.error('📊 [Supertrend] WebSocket connection error:', error);
    });

    // Register callback
    tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);

    // Cleanup
    return () => {
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.unsubscribe([selectedSymbol]);
      tradingViewWebSocket.disconnect();
    };
  }, [selectedSymbol]);

  return (
    <div className="relative flex flex-col h-full bg-widget-body overflow-hidden">
      <WidgetHeader
        title="Supertrend"
        onRemove={onRemove}
        onSettings={() => setShowSettings(true)}
        onFullscreen={onFullscreen}
        helpContent="Displays the Supertrend indicator on the chart, which helps identify the current market trend direction. The indicator appears as a line that changes color based on bullish or bearish market conditions."
      />

      <WidgetSettingsSlideIn
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        widgetType="supertrend"
        widgetPosition={wgid || "supertrend"}
        widgetInstanceId={wgid}
        currentSettings={widgetSettings}
        onSave={handleSaveSettings}
      />

      <div className="flex-1 relative">
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: isDark ? "#0A0A0A" : "#f9fafb" }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-[#FFB02E] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-400">Loading chart...</p>
            </div>
          </div>
        )}
        {error && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: isDark ? "#0A0A0A" : "#fef2f2" }}
          >
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
